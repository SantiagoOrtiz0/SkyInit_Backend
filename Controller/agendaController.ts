// deno-lint-ignore-file no-explicit-any
import { and, asc, desc, eq, inArray, or, sql } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import { agendas, estadosagenda, propiedades, usuarios } from "../Model/schema.ts";
import { notificar } from "../services/notificaciones.ts";

// Flujo de una cita: Pendiente -> Confirmada -> Finalizada. Se puede cancelar mientras no este finalizada.
const ESTADO = { Pendiente: 1, Confirmada: 2, Cancelada: 3, Finalizada: 4 } as const;
const usuarioId = (ctx: any) => Number(ctx.state.user?.sub);
const error = (ctx: any, status: number, mensaje: string) => {
  ctx.response.status = status;
  ctx.response.body = { error: mensaje };
};
const fmt = (f: Date) => f.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });
const MSG_HORARIO = "Las visitas solo se pueden agendar entre 7:00 a. m. y 7:00 p. m.";
const fmtHoraCo = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Bogota",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Valida que la fecha corresponda al horario de atención (07:00 a 19:00, hora de Colombia) */
function enHorarioAtencion(fecha: Date): boolean {
  const partes = fmtHoraCo.formatToParts(fecha);
  const hora = Number(partes.find((p) => p.type === "hour")?.value);
  const minuto = Number(partes.find((p) => p.type === "minute")?.value);
  const minutos = hora * 60 + minuto;
  return minutos >= 7 * 60 && minutos <= 19 * 60;
}

const columnas = {
  agendaID: agendas.agendaID,
  fechaVisita: agendas.fechaVisita,
  notas: agendas.notas,
  fechaCreacion: agendas.fechaCreacion,
  estadoAgendaID: agendas.estadoAgendaID,
  estado: estadosagenda.descripcion,
  propiedadID: propiedades.propiedadID,
  propiedad: propiedades.titulo,
  direccion: propiedades.direccion,
  ciudad: propiedades.ciudad,
  usuarioID: agendas.usuarioID,
  agenteID: agendas.agenteID,
  // Si la cita la creo el agente para un cliente sin cuenta, se usan los datos escritos a mano
  solicitante: sql<string>`COALESCE(${usuarios.nombre}, ${agendas.clienteNombre}, 'Cliente')`,
  telefono: sql<string | null>`COALESCE(${usuarios.telefono}, ${agendas.clienteContacto})`,
  correo: usuarios.correo,
};

function consultaBase() {
  return db.select(columnas).from(agendas)
    .innerJoin(propiedades, eq(agendas.propiedadID, propiedades.propiedadID))
    .leftJoin(usuarios, eq(agendas.usuarioID, usuarios.usuarioID))
    .innerJoin(estadosagenda, eq(agendas.estadoAgendaID, estadosagenda.estadoAgendaID));
}

// POST /api/agenda  { propiedadID, fechaVisita, notas? }
export async function crearVisita(ctx: any) {
  try {
    const { propiedadID, fechaVisita, notas } = await ctx.request.body.json();
    const idProp = Number(propiedadID);
    const fecha = new Date(fechaVisita);
    if (!Number.isInteger(idProp) || idProp <= 0) return error(ctx, 400, "Debes indicar la propiedad");
    if (Number.isNaN(fecha.getTime())) return error(ctx, 400, "La fecha de la visita no es valida");
    if (fecha.getTime() < Date.now() + 60 * 60 * 1000) {
      return error(ctx, 400, "La visita debe agendarse con al menos una hora de anticipacion");
    }
    if (!enHorarioAtencion(fecha)) return error(ctx, 400, MSG_HORARIO);
    if (notas && String(notas).length > 300) return error(ctx, 400, "Las notas no pueden superar 300 caracteres");

    const [prop] = await db.select({
      propiedadID: propiedades.propiedadID,
      titulo: propiedades.titulo,
      estado: propiedades.estado,
      agenteID: propiedades.agenteID,
      inmobiliariaID: propiedades.inmobiliariaID,
    }).from(propiedades).where(eq(propiedades.propiedadID, idProp)).limit(1);
    if (!prop || prop.estado !== "Disponible") return error(ctx, 404, "La propiedad no esta disponible");

    const id = usuarioId(ctx);
    const yaTiene = await db.select({ agendaID: agendas.agendaID }).from(agendas).where(and(
      eq(agendas.usuarioID, id),
      eq(agendas.propiedadID, idProp),
      inArray(agendas.estadoAgendaID, [ESTADO.Pendiente, ESTADO.Confirmada]),
    )).limit(1);
    if (yaTiene.length > 0) return error(ctx, 409, "Ya tienes una visita activa para esta propiedad");

    const [res] = await db.insert(agendas).values({
      usuarioID: id,
      propiedadID: idProp,
      fechaVisita: fecha,
      estadoAgendaID: ESTADO.Pendiente,
      notas: notas ? String(notas).trim() : null,
    });
    const agendaID = Number(res.insertId);

    // Avisar al agente de la propiedad y a los administradores de su inmobiliaria
    const admins = prop.inmobiliariaID
      ? await db.select({ id: usuarios.usuarioID }).from(usuarios)
        .where(and(eq(usuarios.rolID, 1), eq(usuarios.inmobiliariaID, prop.inmobiliariaID), eq(usuarios.estadoCuenta, "Activa")))
      : [];
    await notificar([prop.agenteID, ...admins.map((a) => a.id)], {
      titulo: "Nueva solicitud de visita",
      mensaje: `Solicitaron visitar "${prop.titulo}" el ${fmt(fecha)}.`,
      tipo: "agenda",
      entidadID: agendaID,
      entidadTipo: "agenda",
    });

    ctx.response.status = 201;
    ctx.response.body = { mensaje: "Visita solicitada. Te avisaremos cuando sea confirmada.", agendaID };
  } catch (e) {
    console.error("Error en crearVisita:", e);
    error(ctx, 500, "Error al agendar la visita");
  }
}

// GET /api/agenda/mias
export async function misVisitas(ctx: any) {
  const lista = await consultaBase().where(eq(agendas.usuarioID, usuarioId(ctx))).orderBy(desc(agendas.fechaVisita));
  ctx.response.body = { visitas: lista };
}

/** Devuelve el filtro de propiedades que el usuario puede gestionar, o null si no puede */
async function alcanceGestion(ctx: any) {
  const [u] = await db.select({
    usuarioID: usuarios.usuarioID, rolID: usuarios.rolID, inmobiliariaID: usuarios.inmobiliariaID, estado: usuarios.estadoCuenta,
  }).from(usuarios).where(eq(usuarios.usuarioID, usuarioId(ctx))).limit(1);
  if (!u || u.estado !== "Activa") return null;
  if (u.rolID === 1 && u.inmobiliariaID) return eq(propiedades.inmobiliariaID, u.inmobiliariaID); // Administrador
  if (u.rolID === 2 && u.inmobiliariaID) {
    // Agente: sus propiedades o las citas que el mismo creo, siempre dentro de su inmobiliaria
    return and(
      eq(propiedades.inmobiliariaID, u.inmobiliariaID),
      or(eq(propiedades.agenteID, u.usuarioID), eq(agendas.agenteID, u.usuarioID)),
    );
  }
  return null;
}

// GET /api/agenda/gestion   (Administrador y Agente)
export async function visitasGestion(ctx: any) {
  const alcance = await alcanceGestion(ctx);
  if (!alcance) return error(ctx, 403, "No tienes una inmobiliaria o propiedades asignadas");
  const lista = await consultaBase().where(alcance).orderBy(asc(agendas.fechaVisita));
  ctx.response.body = { visitas: lista };
}

// PATCH /api/agenda/:id/estado  { estadoAgendaID: 2 | 3 }
export async function cambiarEstadoVisita(ctx: any) {
  try {
    const agendaID = Number(ctx.params.id);
    const { estadoAgendaID } = await ctx.request.body.json();
    const nuevo = Number(estadoAgendaID);
    if (!Number.isInteger(agendaID)) return error(ctx, 400, "ID invalido");
    if (nuevo !== ESTADO.Confirmada && nuevo !== ESTADO.Cancelada && nuevo !== ESTADO.Finalizada) return error(ctx, 400, "Estado no permitido");

    const [visita] = await consultaBase().where(eq(agendas.agendaID, agendaID)).limit(1);
    if (!visita) return error(ctx, 404, "Visita no encontrada");
    if (visita.estadoAgendaID === ESTADO.Cancelada) return error(ctx, 409, "La visita ya estaba cancelada");
    if (visita.estadoAgendaID === ESTADO.Finalizada) return error(ctx, 409, "La visita ya fue finalizada");
    if (nuevo === ESTADO.Confirmada && visita.estadoAgendaID !== ESTADO.Pendiente) return error(ctx, 409, "Solo se confirman las visitas pendientes");
    if (nuevo === ESTADO.Finalizada && visita.estadoAgendaID !== ESTADO.Confirmada) return error(ctx, 409, "Primero confirma la visita; despues podras finalizarla");

    const id = usuarioId(ctx);
    const esDueno = visita.usuarioID !== null && visita.usuarioID === id;
    let esGestor = false;
    const alcance = await alcanceGestion(ctx);
    if (alcance) {
      const [ok] = await db.select({ id: agendas.agendaID }).from(agendas)
        .innerJoin(propiedades, eq(agendas.propiedadID, propiedades.propiedadID))
        .where(and(eq(agendas.agendaID, agendaID), alcance)).limit(1);
      esGestor = !!ok;
    }
    // El solicitante solo puede cancelar; confirmar es de quien gestiona la propiedad
    if (!esGestor && !(esDueno && nuevo === ESTADO.Cancelada)) return error(ctx, 403, "No tienes permisos sobre esta visita");

    await db.update(agendas).set({ estadoAgendaID: nuevo }).where(eq(agendas.agendaID, agendaID));

    const texto = nuevo === ESTADO.Confirmada ? "confirmada" : nuevo === ESTADO.Finalizada ? "finalizada" : "cancelada";
    if (esGestor) {
      await notificar([visita.usuarioID], {
        titulo: `Visita ${texto}`,
        mensaje: `Tu visita a "${visita.propiedad}" del ${fmt(visita.fechaVisita)} fue ${texto}.`,
        tipo: "agenda", entidadID: agendaID, entidadTipo: "agenda",
      });
    } else {
      const [prop] = await db.select({ agenteID: propiedades.agenteID }).from(propiedades)
        .where(eq(propiedades.propiedadID, visita.propiedadID)).limit(1);
      await notificar([prop?.agenteID], {
        titulo: "Visita cancelada por el cliente",
        mensaje: `${visita.solicitante} cancelo la visita a "${visita.propiedad}" del ${fmt(visita.fechaVisita)}.`,
        tipo: "agenda", entidadID: agendaID, entidadTipo: "agenda",
      });
    }
    ctx.response.body = { mensaje: `Visita ${texto}` };
  } catch (e) {
    console.error("Error en cambiarEstadoVisita:", e);
    error(ctx, 500, "Error al actualizar la visita");
  }
}

// ── Citas creadas y editadas por el agente (o el administrador) ──────────────

/** Propiedades sobre las que el usuario puede crear citas */
async function propiedadGestionable(ctx: any, propiedadID: number) {
  const [u] = await db.select({
    usuarioID: usuarios.usuarioID, rolID: usuarios.rolID, inmobiliariaID: usuarios.inmobiliariaID, estado: usuarios.estadoCuenta,
  }).from(usuarios).where(eq(usuarios.usuarioID, usuarioId(ctx))).limit(1);
  if (!u || u.estado !== "Activa" || !u.inmobiliariaID) return null;
  const filtro = u.rolID === 1
    ? eq(propiedades.inmobiliariaID, u.inmobiliariaID)
    : u.rolID === 2
    ? and(eq(propiedades.inmobiliariaID, u.inmobiliariaID), eq(propiedades.agenteID, u.usuarioID))
    : null;
  if (!filtro) return null;
  const [p] = await db.select({ propiedadID: propiedades.propiedadID, titulo: propiedades.titulo })
    .from(propiedades).where(and(eq(propiedades.propiedadID, propiedadID), filtro)).limit(1);
  return p ?? null;
}

// GET /api/agenda/propiedades   (Administrador, Agente): propiedades para el formulario de cita
export async function propiedadesParaCita(ctx: any) {
  const [u] = await db.select({ usuarioID: usuarios.usuarioID, rolID: usuarios.rolID, inmobiliariaID: usuarios.inmobiliariaID })
    .from(usuarios).where(eq(usuarios.usuarioID, usuarioId(ctx))).limit(1);
  if (!u?.inmobiliariaID) return error(ctx, 403, "No tienes una inmobiliaria asignada");
  const filtro = u.rolID === 1
    ? eq(propiedades.inmobiliariaID, u.inmobiliariaID)
    : and(eq(propiedades.inmobiliariaID, u.inmobiliariaID), eq(propiedades.agenteID, u.usuarioID));
  const lista = await db.select({ propiedadID: propiedades.propiedadID, titulo: propiedades.titulo, ciudad: propiedades.ciudad })
    .from(propiedades).where(filtro).orderBy(asc(propiedades.titulo));
  ctx.response.body = { propiedades: lista };
}

function leerCliente(body: any) {
  const nombre = body.clienteNombre ? String(body.clienteNombre).trim().slice(0, 100) : null;
  const contacto = body.clienteContacto ? String(body.clienteContacto).trim().slice(0, 100) : null;
  const correo = body.clienteCorreo ? String(body.clienteCorreo).trim().toLowerCase() : null;
  return { nombre, contacto, correo };
}

// POST /api/agenda/citas  { propiedadID, fechaVisita, notas?, clienteCorreo?, clienteNombre?, clienteContacto? }
export async function crearCita(ctx: any) {
  try {
    const body = await ctx.request.body.json().catch(() => ({}));
    const fecha = new Date(body.fechaVisita);
    if (Number.isNaN(fecha.getTime()) || fecha.getTime() < Date.now()) return error(ctx, 400, "La fecha de la cita debe ser futura");
    if (!enHorarioAtencion(fecha)) return error(ctx, 400, MSG_HORARIO);
    if (body.notas && String(body.notas).length > 300) return error(ctx, 400, "Las notas no pueden superar 300 caracteres");
    const prop = await propiedadGestionable(ctx, Number(body.propiedadID));
    if (!prop) return error(ctx, 403, "No puedes crear citas para esa propiedad");

    const cliente = leerCliente(body);
    let clienteID: number | null = null;
    if (cliente.correo) {
      const [c] = await db.select({ id: usuarios.usuarioID, nombre: usuarios.nombre }).from(usuarios)
        .where(and(eq(usuarios.correo, cliente.correo), eq(usuarios.estadoCuenta, "Activa"))).limit(1);
      if (c) { clienteID = c.id; cliente.nombre = cliente.nombre ?? c.nombre; }
      else cliente.contacto = cliente.contacto ?? cliente.correo;
    }
    if (!clienteID && !cliente.nombre) return error(ctx, 400, "Indica el nombre del cliente o el correo de su cuenta");

    const [res] = await db.insert(agendas).values({
      usuarioID: clienteID, propiedadID: prop.propiedadID, fechaVisita: fecha, estadoAgendaID: ESTADO.Pendiente,
      notas: body.notas ? String(body.notas).trim() : null, agenteID: usuarioId(ctx),
      clienteNombre: cliente.nombre, clienteContacto: cliente.contacto,
    });
    const agendaID = Number(res.insertId);
    await notificar([clienteID], {
      titulo: "Tienes una cita agendada",
      mensaje: `Te agendaron una visita a "${prop.titulo}" el ${fmt(fecha)}.`,
      tipo: "agenda", entidadID: agendaID, entidadTipo: "agenda",
    });
    ctx.response.status = 201;
    ctx.response.body = { mensaje: "Cita creada", agendaID, clienteConCuenta: clienteID !== null };
  } catch (e) {
    console.error("Error en crearCita:", e);
    error(ctx, 500, "No se pudo crear la cita");
  }
}

// PUT /api/agenda/:id  { fechaVisita?, notas?, clienteNombre?, clienteContacto? }
export async function editarCita(ctx: any) {
  try {
    const agendaID = Number(ctx.params.id);
    if (!Number.isInteger(agendaID)) return error(ctx, 400, "ID invalido");
    const alcance = await alcanceGestion(ctx);
    if (!alcance) return error(ctx, 403, "No tienes permisos sobre esta cita");
    const [visita] = await consultaBase().where(and(eq(agendas.agendaID, agendaID), alcance)).limit(1);
    if (!visita) return error(ctx, 404, "Cita no encontrada");
    if (visita.estadoAgendaID === ESTADO.Cancelada || visita.estadoAgendaID === ESTADO.Finalizada) {
      return error(ctx, 409, "No se puede editar una cita cancelada o finalizada");
    }

    const body = await ctx.request.body.json().catch(() => ({}));
    const datos: Record<string, unknown> = {};
    let nuevaFecha: Date | null = null;
    if (body.fechaVisita !== undefined) {
      nuevaFecha = new Date(body.fechaVisita);
      if (Number.isNaN(nuevaFecha.getTime()) || nuevaFecha.getTime() < Date.now()) return error(ctx, 400, "La fecha de la cita debe ser futura");
      if (!enHorarioAtencion(nuevaFecha)) return error(ctx, 400, MSG_HORARIO);
      if (nuevaFecha.getTime() !== new Date(visita.fechaVisita).getTime()) {
        datos.fechaVisita = nuevaFecha;
        datos.recordatorioEnviado = 0; // la nueva fecha vuelve a generar recordatorio
      } else nuevaFecha = null;
    }
    if (body.notas !== undefined) {
      if (body.notas && String(body.notas).length > 300) return error(ctx, 400, "Las notas no pueden superar 300 caracteres");
      datos.notas = body.notas ? String(body.notas).trim() : null;
    }
    if (visita.usuarioID === null) {
      if (body.clienteNombre !== undefined) datos.clienteNombre = String(body.clienteNombre).trim().slice(0, 100) || null;
      if (body.clienteContacto !== undefined) datos.clienteContacto = String(body.clienteContacto).trim().slice(0, 100) || null;
    }
    if (Object.keys(datos).length) await db.update(agendas).set(datos).where(eq(agendas.agendaID, agendaID));
    if (nuevaFecha) {
      await notificar([visita.usuarioID], {
        titulo: "Tu visita cambio de fecha",
        mensaje: `La visita a "${visita.propiedad}" ahora es el ${fmt(nuevaFecha)}.`,
        tipo: "agenda", entidadID: agendaID, entidadTipo: "agenda",
      });
    }
    ctx.response.body = { mensaje: "Cita actualizada" };
  } catch (e) {
    console.error("Error en editarCita:", e);
    error(ctx, 500, "No se pudo actualizar la cita");
  }
}

// PATCH /api/agenda/:id/reprogramar  { fechaVisita, notas? } (el usuario solicitante reprograma una visita Pendiente)
export async function reprogramarVisita(ctx: any) {
  try {
    const agendaID = Number(ctx.params.id);
    if (!Number.isInteger(agendaID)) return error(ctx, 400, "ID invalido");
    const body = await ctx.request.body.json().catch(() => ({}));
    const nuevaFecha = new Date(body.fechaVisita);
    if (Number.isNaN(nuevaFecha.getTime())) return error(ctx, 400, "La nueva fecha no es valida");
    if (nuevaFecha.getTime() < Date.now() + 60 * 60 * 1000) {
      return error(ctx, 400, "La visita debe reprogramarse con al menos una hora de anticipacion");
    }
    if (!enHorarioAtencion(nuevaFecha)) return error(ctx, 400, MSG_HORARIO);
    if (body.notas !== undefined && body.notas && String(body.notas).length > 300) {
      return error(ctx, 400, "Las notas no pueden superar 300 caracteres");
    }

    const id = usuarioId(ctx);
    const [visita] = await consultaBase().where(and(eq(agendas.agendaID, agendaID), eq(agendas.usuarioID, id))).limit(1);
    if (!visita) return error(ctx, 404, "Visita no encontrada");
    if (visita.estadoAgendaID !== ESTADO.Pendiente) {
      return error(ctx, 409, "Solo puedes reprogramar visitas en estado pendiente");
    }

    const datos: Record<string, unknown> = { fechaVisita: nuevaFecha, recordatorioEnviado: 0 };
    if (body.notas !== undefined) datos.notas = body.notas ? String(body.notas).trim() : null;
    await db.update(agendas).set(datos).where(eq(agendas.agendaID, agendaID));

    const [prop] = await db.select({ agenteID: propiedades.agenteID, inmobiliariaID: propiedades.inmobiliariaID })
      .from(propiedades).where(eq(propiedades.propiedadID, visita.propiedadID)).limit(1);
    const admins = prop?.inmobiliariaID
      ? await db.select({ id: usuarios.usuarioID }).from(usuarios)
        .where(and(eq(usuarios.rolID, 1), eq(usuarios.inmobiliariaID, prop.inmobiliariaID), eq(usuarios.estadoCuenta, "Activa")))
      : [];
    await notificar([prop?.agenteID, ...admins.map((a) => a.id)], {
      titulo: "Visita reprogramada por el cliente",
      mensaje: `${visita.solicitante} reprogramo la visita a "${visita.propiedad}" para el ${fmt(nuevaFecha)}.`,
      tipo: "agenda", entidadID: agendaID, entidadTipo: "agenda",
    });

    ctx.response.body = { mensaje: "Visita reprogramada correctamente" };
  } catch (e) {
    console.error("Error en reprogramarVisita:", e);
    error(ctx, 500, "No se pudo reprogramar la visita");
  }
}

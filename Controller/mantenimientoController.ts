// deno-lint-ignore-file no-explicit-any
import { and, asc, desc, eq, inArray } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import {
  constructoras, constructorasInmobiliarias, estadosreparacion, historialsolicitud, inmobiliarias, propiedades,
  serviciosmantenimiento, serviciossolicitados, trabajadoressolicitud, usuarios,
} from "../Model/schema.ts";
import { notificar } from "../services/notificaciones.ts";
import { obtenerInmobiliariaScope, ScopeError } from "../Middlewares/inmobiliariasScope.ts";

/**
 * Flujo de mantenimiento:
 *   Usuario solicita un servicio -> la Inmobiliaria lo reenvia a una Constructora asociada
 *   -> la Constructora asigna un grupo de Trabajadores -> los Trabajadores registran el avance.
 */
const ESTADO = { Pendiente: 1, EnProceso: 2, Finalizada: 3 } as const;
const ROL_TRABAJADOR = 6;
const usuarioId = (ctx: any) => Number(ctx.state.user?.sub);
const constructoraId = (ctx: any) => Number(ctx.state.constructoraID);
const error = (ctx: any, status: number, mensaje: string) => {
  ctx.response.status = status;
  ctx.response.body = { error: mensaje };
};

const columnas = {
  solicitudID: serviciossolicitados.solicitudID, notas: serviciossolicitados.notas,
  fechaSolicitud: serviciossolicitados.fechaSolicitud, fechaFinalizacion: serviciossolicitados.fechaFinalizacion,
  fechaReenvio: serviciossolicitados.fechaReenvio, estadoReparacionID: serviciossolicitados.estadoReparacionID,
  estado: estadosreparacion.descripcion, inmobiliariaID: serviciossolicitados.inmobiliariaID, inmobiliaria: inmobiliarias.nombre,
  servicioID: serviciosmantenimiento.servicioID, servicio: serviciosmantenimiento.nombre,
  servicioDescripcion: serviciosmantenimiento.descripcion,
  clienteID: usuarios.usuarioID, cliente: usuarios.nombre, clienteTelefono: usuarios.telefono, clienteCorreo: usuarios.correo,
  propiedad: propiedades.titulo, direccion: propiedades.direccion, ciudad: propiedades.ciudad,
  latitud: propiedades.latitud, longitud: propiedades.longitud,
  constructoraID: serviciossolicitados.constructoraID, constructora: constructoras.nombre,
};

function consulta() {
  return db.select(columnas).from(serviciossolicitados)
    .innerJoin(serviciosmantenimiento, eq(serviciossolicitados.servicioID, serviciosmantenimiento.servicioID))
    .innerJoin(usuarios, eq(serviciossolicitados.usuarioID, usuarios.usuarioID))
    .leftJoin(estadosreparacion, eq(serviciossolicitados.estadoReparacionID, estadosreparacion.estadoReparacionID))
    .leftJoin(inmobiliarias, eq(serviciossolicitados.inmobiliariaID, inmobiliarias.inmobiliariaID))
    .leftJoin(propiedades, eq(serviciossolicitados.propiedadID, propiedades.propiedadID))
    .leftJoin(constructoras, eq(serviciossolicitados.constructoraID, constructoras.constructoraID));
}

/** Agrega a cada solicitud el grupo de trabajadores asignado */
async function conTrabajadores<T extends { solicitudID: number }>(lista: T[]) {
  if (!lista.length) return [];
  const filas = await db.select({
    solicitudID: trabajadoressolicitud.solicitudID, usuarioID: usuarios.usuarioID, nombre: usuarios.nombre, telefono: usuarios.telefono,
  }).from(trabajadoressolicitud).innerJoin(usuarios, eq(trabajadoressolicitud.trabajadorID, usuarios.usuarioID))
    .where(inArray(trabajadoressolicitud.solicitudID, lista.map((s) => s.solicitudID)));
  return lista.map((s) => ({
    ...s,
    trabajadores: filas.filter((f) => f.solicitudID === s.solicitudID).map(({ solicitudID: _s, ...t }) => t),
  }));
}

async function anotar(solicitudID: number, usuarioID: number | null, comentario: string, estadoReparacionID: number | null = null) {
  await db.insert(historialsolicitud).values({ solicitudID, usuarioID, comentario, estadoReparacionID });
}

async function adminsDe(inmobiliariaID: number | null): Promise<number[]> {
  if (!inmobiliariaID) return [];
  const filas = await db.select({ id: usuarios.usuarioID }).from(usuarios)
    .where(and(eq(usuarios.rolID, 1), eq(usuarios.inmobiliariaID, inmobiliariaID), eq(usuarios.estadoCuenta, "Activa")));
  return filas.map((f) => f.id);
}

// ── Inmobiliaria (Administrador) ─────────────────────────────────────────────
// GET /api/mantenimiento/admin
export async function solicitudesInmobiliaria(ctx: any) {
  try {
    const scope = await obtenerInmobiliariaScope(ctx);
    const lista = await consulta().where(eq(serviciossolicitados.inmobiliariaID, scope.inmobiliariaId))
      .orderBy(desc(serviciossolicitados.fechaSolicitud));
    const asociadas = await db.select({ constructoraID: constructoras.constructoraID, nombre: constructoras.nombre })
      .from(constructorasInmobiliarias)
      .innerJoin(constructoras, eq(constructorasInmobiliarias.constructoraID, constructoras.constructoraID))
      .where(and(eq(constructorasInmobiliarias.inmobiliariaID, scope.inmobiliariaId), eq(constructoras.estado, "Activo")))
      .orderBy(asc(constructoras.nombre));
    ctx.response.body = { solicitudes: await conTrabajadores(lista), constructoras: asociadas };
  } catch (e) {
    if (e instanceof ScopeError) return error(ctx, e.status, e.message);
    console.error("Error en solicitudesInmobiliaria:", e);
    error(ctx, 500, "No se pudieron cargar las solicitudes");
  }
}

// POST /api/mantenimiento/admin/:id/reenviar  { constructoraID }
export async function reenviarAConstructora(ctx: any) {
  try {
    const scope = await obtenerInmobiliariaScope(ctx);
    const solicitudID = Number(ctx.params.id);
    const body = await ctx.request.body.json().catch(() => ({}));
    const idConstructora = Number(body.constructoraID);
    if (!Number.isInteger(solicitudID) || !Number.isInteger(idConstructora)) return error(ctx, 400, "Datos invalidos");

    const [sol] = await consulta().where(and(
      eq(serviciossolicitados.solicitudID, solicitudID), eq(serviciossolicitados.inmobiliariaID, scope.inmobiliariaId),
    )).limit(1);
    if (!sol) return error(ctx, 404, "Solicitud no encontrada en tu inmobiliaria");
    if (sol.estadoReparacionID === ESTADO.Finalizada) return error(ctx, 409, "La solicitud ya fue finalizada");

    const [c] = await db.select({ id: constructoras.constructoraID, nombre: constructoras.nombre, usuarioID: constructoras.usuarioID })
      .from(constructorasInmobiliarias)
      .innerJoin(constructoras, eq(constructorasInmobiliarias.constructoraID, constructoras.constructoraID))
      .where(and(
        eq(constructorasInmobiliarias.inmobiliariaID, scope.inmobiliariaId),
        eq(constructoras.constructoraID, idConstructora), eq(constructoras.estado, "Activo"),
      )).limit(1);
    if (!c) return error(ctx, 400, "La constructora no esta asociada a tu inmobiliaria");

    const cambio = sol.constructoraID !== null && sol.constructoraID !== c.id;
    if (cambio) await db.delete(trabajadoressolicitud).where(eq(trabajadoressolicitud.solicitudID, solicitudID));
    await db.update(serviciossolicitados).set({
      constructoraID: c.id, fechaReenvio: new Date(), estadoReparacionID: sol.estadoReparacionID ?? ESTADO.Pendiente,
    }).where(eq(serviciossolicitados.solicitudID, solicitudID));
    await anotar(solicitudID, usuarioId(ctx), `La inmobiliaria reenvio la solicitud a ${c.nombre}.`);
    await notificar([c.usuarioID], {
      titulo: "Nueva solicitud de mantenimiento",
      mensaje: `${sol.inmobiliaria ?? "Una inmobiliaria"} te reenvio el servicio "${sol.servicio}" solicitado por ${sol.cliente}. Asigna a tus trabajadores.`,
      tipo: "mantenimiento", entidadID: solicitudID, entidadTipo: "solicitud",
    });
    await notificar([sol.clienteID], {
      titulo: "Tu solicitud esta en gestion",
      mensaje: `Tu solicitud de "${sol.servicio}" fue asignada a la constructora ${c.nombre}.`,
      tipo: "mantenimiento", entidadID: solicitudID, entidadTipo: "solicitud",
    });
    ctx.response.body = { mensaje: `Solicitud reenviada a ${c.nombre}` };
  } catch (e) {
    if (e instanceof ScopeError) return error(ctx, e.status, e.message);
    console.error("Error en reenviarAConstructora:", e);
    error(ctx, 500, "No se pudo reenviar la solicitud");
  }
}

// ── Constructora ─────────────────────────────────────────────────────────────
// GET /api/mantenimiento/constructora
export async function solicitudesConstructora(ctx: any) {
  const lista = await consulta().where(eq(serviciossolicitados.constructoraID, constructoraId(ctx)))
    .orderBy(desc(serviciossolicitados.fechaReenvio));
  ctx.response.body = { solicitudes: await conTrabajadores(lista) };
}

// POST /api/mantenimiento/constructora/:id/asignar  { trabajadores: number[] }
export async function asignarTrabajadores(ctx: any) {
  try {
    const solicitudID = Number(ctx.params.id);
    const body = await ctx.request.body.json().catch(() => ({}));
    const pedidos: number[] = Array.isArray(body.trabajadores)
      ? [...new Set<number>(body.trabajadores.map(Number).filter((n: number) => Number.isInteger(n) && n > 0))]
      : [];
    if (!pedidos.length) return error(ctx, 400, "Selecciona al menos un trabajador");
    if (pedidos.length > 20) return error(ctx, 400, "Maximo 20 trabajadores por trabajo");

    const [sol] = await consulta().where(and(
      eq(serviciossolicitados.solicitudID, solicitudID), eq(serviciossolicitados.constructoraID, constructoraId(ctx)),
    )).limit(1);
    if (!sol) return error(ctx, 404, "Solicitud no encontrada");
    if (sol.estadoReparacionID === ESTADO.Finalizada) return error(ctx, 409, "La solicitud ya fue finalizada");

    const validos = await db.select({ id: usuarios.usuarioID, nombre: usuarios.nombre }).from(usuarios).where(and(
      inArray(usuarios.usuarioID, pedidos), eq(usuarios.rolID, ROL_TRABAJADOR),
      eq(usuarios.constructoraID, constructoraId(ctx)), eq(usuarios.estadoCuenta, "Activa"),
    ));
    if (validos.length !== pedidos.length) return error(ctx, 400, "Algun trabajador no pertenece a tu constructora o esta inactivo");

    const previos = (await db.select({ id: trabajadoressolicitud.trabajadorID }).from(trabajadoressolicitud)
      .where(eq(trabajadoressolicitud.solicitudID, solicitudID))).map((p) => p.id);
    await db.delete(trabajadoressolicitud).where(eq(trabajadoressolicitud.solicitudID, solicitudID));
    await db.insert(trabajadoressolicitud).values(validos.map((v) => ({ solicitudID, trabajadorID: v.id })));
    await anotar(solicitudID, usuarioId(ctx), `Grupo asignado: ${validos.map((v) => v.nombre).join(", ")}.`);

    await notificar(validos.filter((v) => !previos.includes(v.id)).map((v) => v.id), {
      titulo: "Nuevo trabajo de mantenimiento",
      mensaje: `Te asignaron el servicio "${sol.servicio}" para ${sol.cliente}${sol.direccion ? ` en ${sol.direccion}` : ""}.`,
      tipo: "mantenimiento", entidadID: solicitudID, entidadTipo: "solicitud",
    });
    await notificar(await adminsDe(sol.inmobiliariaID), {
      titulo: "Trabajadores asignados",
      mensaje: `${sol.constructora ?? "La constructora"} asigno ${validos.length} trabajador(es) al servicio "${sol.servicio}".`,
      tipo: "mantenimiento", entidadID: solicitudID, entidadTipo: "solicitud",
    });
    ctx.response.body = { mensaje: "Grupo de trabajadores asignado" };
  } catch (e) {
    console.error("Error en asignarTrabajadores:", e);
    error(ctx, 500, "No se pudo asignar el grupo");
  }
}

// ── Trabajador ───────────────────────────────────────────────────────────────
// GET /api/mantenimiento/trabajador
export async function trabajosTrabajador(ctx: any) {
  const mias = await db.select({
    id: trabajadoressolicitud.solicitudID,
    fechaAsignacion: trabajadoressolicitud.fechaAsignacion,
  }).from(trabajadoressolicitud)
    .where(eq(trabajadoressolicitud.trabajadorID, usuarioId(ctx)));
  if (!mias.length) { ctx.response.body = { trabajos: [] }; return; }
  const asignacionPorId = new Map(mias.map((m) => [m.id, m.fechaAsignacion]));
  const lista = await consulta().where(inArray(serviciossolicitados.solicitudID, mias.map((m) => m.id)))
    .orderBy(desc(serviciossolicitados.fechaReenvio));
  // El trabajador no necesita el correo del cliente
  ctx.response.body = {
    trabajos: (await conTrabajadores(lista)).map(({ clienteCorreo: _c, ...t }) => ({
      ...t,
      fechaAsignacion: asignacionPorId.get(t.solicitudID) ?? null,
    })),
  };
}

// POST /api/mantenimiento/trabajador/:id/avance  { comentario, estadoReparacionID?: 2 | 3 }
export async function registrarAvanceTrabajo(ctx: any) {
  try {
    const solicitudID = Number(ctx.params.id);
    const body = await ctx.request.body.json().catch(() => ({}));
    const comentario = String(body.comentario ?? "").trim();
    const nuevo = body.estadoReparacionID === undefined || body.estadoReparacionID === null ? null : Number(body.estadoReparacionID);
    if (nuevo !== null && nuevo !== ESTADO.EnProceso && nuevo !== ESTADO.Finalizada) return error(ctx, 400, "Estado no permitido");

    const [asignado] = await db.select({ id: trabajadoressolicitud.solicitudID }).from(trabajadoressolicitud).where(and(
      eq(trabajadoressolicitud.solicitudID, solicitudID), eq(trabajadoressolicitud.trabajadorID, usuarioId(ctx)),
    )).limit(1);
    if (!asignado) return error(ctx, 404, "Trabajo no encontrado");
    const [sol] = await consulta().where(eq(serviciossolicitados.solicitudID, solicitudID)).limit(1);
    if (!sol) return error(ctx, 404, "Trabajo no encontrado");
    if (sol.estadoReparacionID === ESTADO.Finalizada) return error(ctx, 409, "El trabajo ya fue finalizado");
    const cambia = nuevo !== null && nuevo !== sol.estadoReparacionID;
    if (!comentario && !cambia) return error(ctx, 400, "Escribe un comentario o cambia el estado");
    if (comentario.length > 2000) return error(ctx, 400, "El comentario es demasiado largo");

    if (cambia) {
      await db.update(serviciossolicitados).set({
        estadoReparacionID: nuevo, fechaFinalizacion: nuevo === ESTADO.Finalizada ? new Date() : null,
      }).where(eq(serviciossolicitados.solicitudID, solicitudID));
    }
    const textoEstado = nuevo === ESTADO.Finalizada ? "Trabajo finalizado" : "Trabajo en proceso";
    await anotar(solicitudID, usuarioId(ctx), comentario || `${textoEstado}.`, cambia ? nuevo : null);

    const [dueno] = sol.constructoraID
      ? await db.select({ id: constructoras.usuarioID }).from(constructoras).where(eq(constructoras.constructoraID, sol.constructoraID)).limit(1)
      : [];
    if (cambia) {
      await notificar([sol.clienteID], {
        titulo: nuevo === ESTADO.Finalizada ? "Tu servicio fue finalizado" : "Tu servicio esta en proceso",
        mensaje: `Servicio "${sol.servicio}": ${comentario || textoEstado}`.slice(0, 500),
        tipo: "mantenimiento", entidadID: solicitudID, entidadTipo: "solicitud",
      });
    }
    await notificar([dueno?.id, ...(cambia ? await adminsDe(sol.inmobiliariaID) : [])], {
      titulo: cambia ? `${textoEstado}: ${sol.servicio}` : `Avance en ${sol.servicio}`,
      mensaje: (comentario || textoEstado).slice(0, 500),
      tipo: "mantenimiento", entidadID: solicitudID, entidadTipo: "solicitud",
    });
    ctx.response.status = 201;
    ctx.response.body = { mensaje: "Avance registrado" };
  } catch (e) {
    console.error("Error en registrarAvanceTrabajo:", e);
    error(ctx, 500, "No se pudo registrar el avance");
  }
}

// ── Historial (quien participa en la solicitud) ──────────────────────────────
// GET /api/mantenimiento/:id/historial
export async function historialSolicitud(ctx: any) {
  const solicitudID = Number(ctx.params.id);
  const [sol] = await db.select({
    usuarioID: serviciossolicitados.usuarioID, inmobiliariaID: serviciossolicitados.inmobiliariaID,
    constructoraID: serviciossolicitados.constructoraID,
  }).from(serviciossolicitados).where(eq(serviciossolicitados.solicitudID, solicitudID)).limit(1);
  if (!sol) return error(ctx, 404, "Solicitud no encontrada");

  const id = usuarioId(ctx);
  const [yo] = await db.select({ rolID: usuarios.rolID, inmobiliariaID: usuarios.inmobiliariaID })
    .from(usuarios).where(eq(usuarios.usuarioID, id)).limit(1);
  let permitido = sol.usuarioID === id || (yo?.rolID === 1 && !!yo.inmobiliariaID && yo.inmobiliariaID === sol.inmobiliariaID);
  if (!permitido && yo?.rolID === 5 && sol.constructoraID) {
    const [c] = await db.select({ id: constructoras.constructoraID }).from(constructoras)
      .where(and(eq(constructoras.constructoraID, sol.constructoraID), eq(constructoras.usuarioID, id))).limit(1);
    permitido = !!c;
  }
  if (!permitido && yo?.rolID === ROL_TRABAJADOR) {
    const [a] = await db.select({ id: trabajadoressolicitud.solicitudID }).from(trabajadoressolicitud)
      .where(and(eq(trabajadoressolicitud.solicitudID, solicitudID), eq(trabajadoressolicitud.trabajadorID, id))).limit(1);
    permitido = !!a;
  }
  if (!permitido) return error(ctx, 403, "No tienes acceso a esta solicitud");

  const entradas = await db.select({
    historialID: historialsolicitud.historialID, comentario: historialsolicitud.comentario, fecha: historialsolicitud.fecha,
    estado: estadosreparacion.descripcion, autor: usuarios.nombre,
  }).from(historialsolicitud)
    .leftJoin(usuarios, eq(historialsolicitud.usuarioID, usuarios.usuarioID))
    .leftJoin(estadosreparacion, eq(historialsolicitud.estadoReparacionID, estadosreparacion.estadoReparacionID))
    .where(eq(historialsolicitud.solicitudID, solicitudID)).orderBy(desc(historialsolicitud.fecha), desc(historialsolicitud.historialID));
  ctx.response.body = { historial: entradas };
}

// deno-lint-ignore-file no-explicit-any
import { and, asc, bcrypt, desc, eq, inArray, sql } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import {
  constructoras, estadosreparacion, etapasproyecto, propiedades, proyectos, seguimientotareas,
  serviciosmantenimiento, serviciossolicitados, tareasproyecto, trabajadoressolicitud, usuarios,
} from "../Model/schema.ts";
import { notificar } from "../services/notificaciones.ts";

/**
 * Organizacion del proyecto (etapas y tareas), trabajadores de la constructora
 * y seguimiento (bitacora por tarea).
 *
 *  - Rol Constructora: gestiona etapas, tareas y trabajadores de SUS proyectos.
 *  - Rol Trabajador:   ve sus tareas, cambia su estado y deja seguimiento.
 */
const ROL_TRABAJADOR = 6;
const ESTADOS = ["Pendiente", "En progreso", "Completada"];
const PRIORIDADES = ["Baja", "Media", "Alta"];
const REGEX_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const usuarioId = (ctx: any) => Number(ctx.state.user?.sub);
const constructoraId = (ctx: any) => Number(ctx.state.constructoraID);
const error = (ctx: any, status: number, mensaje: string) => {
  ctx.response.status = status;
  ctx.response.body = { error: mensaje };
};
const fechaODefecto = (v: unknown) => {
  if (!v) return null;
  const d = new Date(String(v).length === 10 ? `${v}T00:00:00` : String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};

async function proyectoPropio(ctx: any, proyectoID: number) {
  const [p] = await db.select().from(proyectos)
    .where(and(eq(proyectos.proyectoID, proyectoID), eq(proyectos.constructoraID, constructoraId(ctx)))).limit(1);
  return p ?? null;
}

/** Recalcula el avance del proyecto a partir de sus tareas completadas */
async function recalcularAvance(proyectoID: number): Promise<number | null> {
  const [r] = await db.select({
    total: sql<number>`COUNT(*)`,
    hechas: sql<number>`SUM(CASE WHEN ${tareasproyecto.estado} = 'Completada' THEN 1 ELSE 0 END)`,
  }).from(tareasproyecto).where(eq(tareasproyecto.proyectoID, proyectoID));
  const total = Number(r?.total ?? 0);
  if (total === 0) return null; // sin tareas: se conserva el avance manual
  const pct = Math.round((Number(r.hechas ?? 0) / total) * 10000) / 100;
  await db.update(proyectos).set({ porcentajeAvance: pct.toFixed(2) }).where(eq(proyectos.proyectoID, proyectoID));
  return pct;
}

// ── Proyectos de la constructora con resumen ─────────────────────────────────
// GET /api/organizacion/proyectos
export async function listarProyectosOrganizacion(ctx: any) {
  const lista = await db.select({
    proyectoID: proyectos.proyectoID, nombre: proyectos.nombre, ubicacion: proyectos.ubicacion,
    porcentajeAvance: proyectos.porcentajeAvance, fechaInicio: proyectos.fechaInicio, fechaFin: proyectos.fechaFin,
  }).from(proyectos).where(eq(proyectos.constructoraID, constructoraId(ctx))).orderBy(asc(proyectos.nombre));
  const ids = lista.map((p) => p.proyectoID);
  const conteos = ids.length
    ? await db.select({
      proyectoID: tareasproyecto.proyectoID,
      total: sql<number>`COUNT(*)`,
      hechas: sql<number>`SUM(CASE WHEN ${tareasproyecto.estado} = 'Completada' THEN 1 ELSE 0 END)`,
    }).from(tareasproyecto).where(inArray(tareasproyecto.proyectoID, ids)).groupBy(tareasproyecto.proyectoID)
    : [];
  const mapa = new Map(conteos.map((c) => [c.proyectoID, c]));
  ctx.response.body = {
    proyectos: lista.map((p) => ({
      ...p,
      tareasTotal: Number(mapa.get(p.proyectoID)?.total ?? 0),
      tareasCompletadas: Number(mapa.get(p.proyectoID)?.hechas ?? 0),
    })),
  };
}

// GET /api/organizacion/proyectos/:id   -> proyecto + etapas con sus tareas
export async function detalleOrganizacion(ctx: any) {
  const proyecto = await proyectoPropio(ctx, Number(ctx.params.id));
  if (!proyecto) return error(ctx, 404, "Proyecto no encontrado");
  const etapas = await db.select().from(etapasproyecto)
    .where(eq(etapasproyecto.proyectoID, proyecto.proyectoID)).orderBy(asc(etapasproyecto.orden), asc(etapasproyecto.etapaID));
  const tareas = await db.select({
    tareaID: tareasproyecto.tareaID, etapaID: tareasproyecto.etapaID, titulo: tareasproyecto.titulo,
    descripcion: tareasproyecto.descripcion, asignadoA: tareasproyecto.asignadoA, asignadoNombre: usuarios.nombre,
    estado: tareasproyecto.estado, prioridad: tareasproyecto.prioridad, fechaLimite: tareasproyecto.fechaLimite,
    fechaCreacion: tareasproyecto.fechaCreacion, fechaCompletada: tareasproyecto.fechaCompletada,
  }).from(tareasproyecto).leftJoin(usuarios, eq(tareasproyecto.asignadoA, usuarios.usuarioID))
    .where(eq(tareasproyecto.proyectoID, proyecto.proyectoID)).orderBy(asc(tareasproyecto.tareaID));
  ctx.response.body = {
    proyecto,
    etapas: etapas.map((e) => ({ ...e, tareas: tareas.filter((t) => t.etapaID === e.etapaID) })),
    resumen: {
      total: tareas.length,
      pendientes: tareas.filter((t) => t.estado === "Pendiente").length,
      enProgreso: tareas.filter((t) => t.estado === "En progreso").length,
      completadas: tareas.filter((t) => t.estado === "Completada").length,
    },
  };
}

// ── Etapas ───────────────────────────────────────────────────────────────────
// POST /api/organizacion/proyectos/:id/etapas  { nombre, fechaInicio?, fechaFin? }
export async function crearEtapa(ctx: any) {
  const proyecto = await proyectoPropio(ctx, Number(ctx.params.id));
  if (!proyecto) return error(ctx, 404, "Proyecto no encontrado");
  const body = await ctx.request.body.json().catch(() => ({}));
  const nombre = String(body.nombre ?? "").trim();
  if (!nombre || nombre.length > 120) return error(ctx, 400, "El nombre de la etapa es obligatorio (max. 120 caracteres)");
  const [{ max }] = await db.select({ max: sql<number>`COALESCE(MAX(${etapasproyecto.orden}), 0)` })
    .from(etapasproyecto).where(eq(etapasproyecto.proyectoID, proyecto.proyectoID));
  const [res] = await db.insert(etapasproyecto).values({
    proyectoID: proyecto.proyectoID, nombre, orden: Number(max) + 1,
    fechaInicio: fechaODefecto(body.fechaInicio), fechaFin: fechaODefecto(body.fechaFin),
  });
  ctx.response.status = 201;
  ctx.response.body = { mensaje: "Etapa creada", etapaID: Number(res.insertId) };
}

async function etapaPropia(ctx: any, etapaID: number) {
  const [e] = await db.select({ etapaID: etapasproyecto.etapaID, proyectoID: etapasproyecto.proyectoID, nombre: etapasproyecto.nombre })
    .from(etapasproyecto).innerJoin(proyectos, eq(etapasproyecto.proyectoID, proyectos.proyectoID))
    .where(and(eq(etapasproyecto.etapaID, etapaID), eq(proyectos.constructoraID, constructoraId(ctx)))).limit(1);
  return e ?? null;
}

// PUT /api/organizacion/etapas/:id  { nombre?, orden?, fechaInicio?, fechaFin? }
export async function editarEtapa(ctx: any) {
  const etapa = await etapaPropia(ctx, Number(ctx.params.id));
  if (!etapa) return error(ctx, 404, "Etapa no encontrada");
  const body = await ctx.request.body.json().catch(() => ({}));
  const datos: Record<string, unknown> = {};
  if (body.nombre !== undefined) {
    const nombre = String(body.nombre).trim();
    if (!nombre || nombre.length > 120) return error(ctx, 400, "Nombre de etapa invalido");
    datos.nombre = nombre;
  }
  if (body.orden !== undefined && Number.isInteger(Number(body.orden))) datos.orden = Number(body.orden);
  if (body.fechaInicio !== undefined) datos.fechaInicio = fechaODefecto(body.fechaInicio);
  if (body.fechaFin !== undefined) datos.fechaFin = fechaODefecto(body.fechaFin);
  if (Object.keys(datos).length) await db.update(etapasproyecto).set(datos).where(eq(etapasproyecto.etapaID, etapa.etapaID));
  ctx.response.body = { mensaje: "Etapa actualizada" };
}

// DELETE /api/organizacion/etapas/:id   (borra tambien sus tareas)
export async function eliminarEtapa(ctx: any) {
  const etapa = await etapaPropia(ctx, Number(ctx.params.id));
  if (!etapa) return error(ctx, 404, "Etapa no encontrada");
  await db.delete(etapasproyecto).where(eq(etapasproyecto.etapaID, etapa.etapaID));
  await recalcularAvance(etapa.proyectoID);
  ctx.response.body = { mensaje: "Etapa eliminada" };
}

// ── Tareas ───────────────────────────────────────────────────────────────────
async function trabajadorPropio(ctx: any, id: unknown): Promise<number | null | false> {
  if (id === null || id === undefined || id === "") return null;
  const [t] = await db.select({ id: usuarios.usuarioID }).from(usuarios).where(and(
    eq(usuarios.usuarioID, Number(id)), eq(usuarios.rolID, ROL_TRABAJADOR),
    eq(usuarios.constructoraID, constructoraId(ctx)), eq(usuarios.estadoCuenta, "Activa"),
  )).limit(1);
  return t ? t.id : false;
}

// POST /api/organizacion/etapas/:id/tareas  { titulo, descripcion?, asignadoA?, prioridad?, fechaLimite? }
export async function crearTarea(ctx: any) {
  const etapa = await etapaPropia(ctx, Number(ctx.params.id));
  if (!etapa) return error(ctx, 404, "Etapa no encontrada");
  const body = await ctx.request.body.json().catch(() => ({}));
  const titulo = String(body.titulo ?? "").trim();
  if (!titulo || titulo.length > 150) return error(ctx, 400, "El titulo de la tarea es obligatorio (max. 150 caracteres)");
  const prioridad = PRIORIDADES.includes(body.prioridad) ? body.prioridad : "Media";
  const asignadoA = await trabajadorPropio(ctx, body.asignadoA);
  if (asignadoA === false) return error(ctx, 400, "El trabajador no pertenece a tu constructora o esta inactivo");

  const [res] = await db.insert(tareasproyecto).values({
    proyectoID: etapa.proyectoID, etapaID: etapa.etapaID, titulo,
    descripcion: body.descripcion ? String(body.descripcion).trim() : null,
    asignadoA, prioridad, fechaLimite: fechaODefecto(body.fechaLimite),
  });
  const tareaID = Number(res.insertId);
  await recalcularAvance(etapa.proyectoID);
  await notificar([asignadoA], {
    titulo: "Nueva tarea asignada",
    mensaje: `Te asignaron la tarea "${titulo}" en la etapa "${etapa.nombre}".`,
    tipo: "tarea", entidadID: tareaID, entidadTipo: "tarea",
  });
  ctx.response.status = 201;
  ctx.response.body = { mensaje: "Tarea creada", tareaID };
}

async function tareaPropia(ctx: any, tareaID: number) {
  const [t] = await db.select({
    tareaID: tareasproyecto.tareaID, proyectoID: tareasproyecto.proyectoID, titulo: tareasproyecto.titulo,
    asignadoA: tareasproyecto.asignadoA, estado: tareasproyecto.estado,
  }).from(tareasproyecto).innerJoin(proyectos, eq(tareasproyecto.proyectoID, proyectos.proyectoID))
    .where(and(eq(tareasproyecto.tareaID, tareaID), eq(proyectos.constructoraID, constructoraId(ctx)))).limit(1);
  return t ?? null;
}

// PUT /api/organizacion/tareas/:id
export async function editarTarea(ctx: any) {
  const tarea = await tareaPropia(ctx, Number(ctx.params.id));
  if (!tarea) return error(ctx, 404, "Tarea no encontrada");
  const body = await ctx.request.body.json().catch(() => ({}));
  const datos: Record<string, unknown> = {};
  if (body.titulo !== undefined) {
    const titulo = String(body.titulo).trim();
    if (!titulo || titulo.length > 150) return error(ctx, 400, "Titulo invalido");
    datos.titulo = titulo;
  }
  if (body.descripcion !== undefined) datos.descripcion = body.descripcion ? String(body.descripcion).trim() : null;
  if (body.prioridad !== undefined) {
    if (!PRIORIDADES.includes(body.prioridad)) return error(ctx, 400, "Prioridad invalida");
    datos.prioridad = body.prioridad;
  }
  if (body.fechaLimite !== undefined) datos.fechaLimite = fechaODefecto(body.fechaLimite);
  if (body.estado !== undefined) {
    if (!ESTADOS.includes(body.estado)) return error(ctx, 400, "Estado invalido");
    datos.estado = body.estado;
    datos.fechaCompletada = body.estado === "Completada" ? new Date() : null;
  }
  let nuevoAsignado: number | null | undefined;
  if (body.asignadoA !== undefined) {
    const a = await trabajadorPropio(ctx, body.asignadoA);
    if (a === false) return error(ctx, 400, "El trabajador no pertenece a tu constructora o esta inactivo");
    datos.asignadoA = a;
    nuevoAsignado = a;
  }
  if (Object.keys(datos).length) await db.update(tareasproyecto).set(datos).where(eq(tareasproyecto.tareaID, tarea.tareaID));
  if (datos.estado && datos.estado !== tarea.estado) {
    await db.insert(seguimientotareas).values({
      tareaID: tarea.tareaID, usuarioID: usuarioId(ctx),
      comentario: `La constructora cambio el estado a "${datos.estado}".`, estadoNuevo: String(datos.estado),
    });
    await recalcularAvance(tarea.proyectoID);
  }
  if (nuevoAsignado && nuevoAsignado !== tarea.asignadoA) {
    await notificar([nuevoAsignado], {
      titulo: "Nueva tarea asignada", mensaje: `Te asignaron la tarea "${datos.titulo ?? tarea.titulo}".`,
      tipo: "tarea", entidadID: tarea.tareaID, entidadTipo: "tarea",
    });
  }
  ctx.response.body = { mensaje: "Tarea actualizada" };
}

// DELETE /api/organizacion/tareas/:id
export async function eliminarTarea(ctx: any) {
  const tarea = await tareaPropia(ctx, Number(ctx.params.id));
  if (!tarea) return error(ctx, 404, "Tarea no encontrada");
  await db.delete(tareasproyecto).where(eq(tareasproyecto.tareaID, tarea.tareaID));
  await recalcularAvance(tarea.proyectoID);
  ctx.response.body = { mensaje: "Tarea eliminada" };
}

// ── Trabajadores de la constructora ──────────────────────────────────────────
// GET /api/organizacion/trabajadores
export async function listarTrabajadores(ctx: any) {
  const lista = await db.select({
    usuarioID: usuarios.usuarioID, nombre: usuarios.nombre, correo: usuarios.correo, telefono: usuarios.telefono,
    estadoCuenta: usuarios.estadoCuenta, fotoPerfil: usuarios.fotoPerfil,
    tareasAbiertas: sql<number>`(SELECT COUNT(*) FROM tareasproyecto t WHERE t.AsignadoA = ${usuarios.usuarioID} AND t.Estado <> 'Completada')`,
  }).from(usuarios).where(and(eq(usuarios.rolID, ROL_TRABAJADOR), eq(usuarios.constructoraID, constructoraId(ctx))))
    .orderBy(asc(usuarios.nombre));
  ctx.response.body = { trabajadores: lista.map((t) => ({ ...t, tareasAbiertas: Number(t.tareasAbiertas) })) };
}

// POST /api/organizacion/trabajadores  { nombre, correo, password, telefono? }
export async function crearTrabajador(ctx: any) {
  try {
    const body = await ctx.request.body.json().catch(() => ({}));
    const nombre = String(body.nombre ?? "").trim();
    const correo = String(body.correo ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!nombre || nombre.length > 100) return error(ctx, 400, "El nombre es obligatorio");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 100) return error(ctx, 400, "Correo invalido");
    if (!REGEX_PASSWORD.test(password)) {
      return error(ctx, 400, "La contraseña debe tener minimo 8 caracteres, mayuscula, minuscula, numero y caracter especial");
    }
    const [existe] = await db.select({ id: usuarios.usuarioID }).from(usuarios).where(eq(usuarios.correo, correo)).limit(1);
    if (existe) return error(ctx, 409, "Ya existe una cuenta con ese correo");

    const [res] = await db.insert(usuarios).values({
      nombre, correo, contrasenaHash: await bcrypt.hash(password),
      telefono: body.telefono ? String(body.telefono).trim().slice(0, 20) : null,
      rolID: ROL_TRABAJADOR, constructoraID: constructoraId(ctx), estadoCuenta: "Activa", aceptoTerminos: 1,
    });
    ctx.response.status = 201;
    ctx.response.body = { mensaje: "Trabajador creado", usuarioID: Number(res.insertId) };
  } catch (e) {
    console.error("Error en crearTrabajador:", e);
    error(ctx, 500, "No se pudo crear el trabajador");
  }
}

// PATCH /api/organizacion/trabajadores/:id/estado  { estadoCuenta: "Activa" | "Inactiva" }
export async function cambiarEstadoTrabajador(ctx: any) {
  const body = await ctx.request.body.json().catch(() => ({}));
  if (!["Activa", "Inactiva"].includes(body.estadoCuenta)) return error(ctx, 400, "Estado invalido");
  const [res] = await db.update(usuarios).set({ estadoCuenta: body.estadoCuenta }).where(and(
    eq(usuarios.usuarioID, Number(ctx.params.id)), eq(usuarios.rolID, ROL_TRABAJADOR), eq(usuarios.constructoraID, constructoraId(ctx)),
  ));
  if (!res.affectedRows) {
    const [existe] = await db.select({ id: usuarios.usuarioID }).from(usuarios).where(and(
      eq(usuarios.usuarioID, Number(ctx.params.id)), eq(usuarios.rolID, ROL_TRABAJADOR), eq(usuarios.constructoraID, constructoraId(ctx)),
    )).limit(1);
    if (!existe) return error(ctx, 404, "Trabajador no encontrado");
  }
  ctx.response.body = { mensaje: "Estado actualizado" };
}

// ── Seguimiento ──────────────────────────────────────────────────────────────
/** Devuelve la tarea si el usuario es la constructora dueña o el trabajador asignado */
async function tareaAccesible(ctx: any, tareaID: number) {
  const id = usuarioId(ctx);
  const [t] = await db.select({
    tareaID: tareasproyecto.tareaID, proyectoID: tareasproyecto.proyectoID, titulo: tareasproyecto.titulo,
    descripcion: tareasproyecto.descripcion, estado: tareasproyecto.estado, prioridad: tareasproyecto.prioridad,
    fechaLimite: tareasproyecto.fechaLimite, asignadoA: tareasproyecto.asignadoA,
    proyecto: proyectos.nombre, etapa: etapasproyecto.nombre, duenoConstructora: constructoras.usuarioID,
  }).from(tareasproyecto)
    .innerJoin(proyectos, eq(tareasproyecto.proyectoID, proyectos.proyectoID))
    .innerJoin(etapasproyecto, eq(tareasproyecto.etapaID, etapasproyecto.etapaID))
    .leftJoin(constructoras, eq(proyectos.constructoraID, constructoras.constructoraID))
    .where(eq(tareasproyecto.tareaID, tareaID)).limit(1);
  if (!t) return null;
  const rol = ctx.state.user?.rol;
  if (rol === "Constructora" && t.duenoConstructora === id) return { ...t, esConstructora: true };
  if (rol === "Trabajador" && t.asignadoA === id) return { ...t, esConstructora: false };
  return null;
}

// GET /api/seguimiento/tareas/:id
export async function verSeguimiento(ctx: any) {
  const tarea = await tareaAccesible(ctx, Number(ctx.params.id));
  if (!tarea) return error(ctx, 404, "Tarea no encontrada");
  const entradas = await db.select({
    seguimientoID: seguimientotareas.seguimientoID, comentario: seguimientotareas.comentario,
    estadoNuevo: seguimientotareas.estadoNuevo, fecha: seguimientotareas.fecha, autor: usuarios.nombre,
  }).from(seguimientotareas).innerJoin(usuarios, eq(seguimientotareas.usuarioID, usuarios.usuarioID))
    .where(eq(seguimientotareas.tareaID, tarea.tareaID)).orderBy(desc(seguimientotareas.fecha));
  const { duenoConstructora: _d, esConstructora: _e, ...publica } = tarea;
  ctx.response.body = { tarea: publica, seguimiento: entradas };
}

// POST /api/seguimiento/tareas/:id  { comentario, estado? }
export async function registrarSeguimiento(ctx: any) {
  try {
    const tarea = await tareaAccesible(ctx, Number(ctx.params.id));
    if (!tarea) return error(ctx, 404, "Tarea no encontrada");
    const body = await ctx.request.body.json().catch(() => ({}));
    const comentario = String(body.comentario ?? "").trim();
    const estado = body.estado;
    if (estado !== undefined && estado !== null && !ESTADOS.includes(estado)) return error(ctx, 400, "Estado invalido");
    const cambia = !!estado && estado !== tarea.estado;
    if (!comentario && !cambia) return error(ctx, 400, "Escribe un comentario o cambia el estado");
    if (comentario.length > 2000) return error(ctx, 400, "El comentario es demasiado largo");

    await db.insert(seguimientotareas).values({
      tareaID: tarea.tareaID, usuarioID: usuarioId(ctx),
      comentario: comentario || `Estado cambiado a "${estado}".`, estadoNuevo: cambia ? estado : null,
    });
    let avance: number | null = null;
    if (cambia) {
      await db.update(tareasproyecto).set({
        estado, fechaCompletada: estado === "Completada" ? new Date() : null,
      }).where(eq(tareasproyecto.tareaID, tarea.tareaID));
      avance = await recalcularAvance(tarea.proyectoID);
    }
    // Avisar a la otra parte
    const destino = tarea.esConstructora ? tarea.asignadoA : tarea.duenoConstructora;
    await notificar([destino], {
      titulo: cambia ? `Tarea ${String(estado).toLowerCase()}` : "Nuevo seguimiento en una tarea",
      mensaje: `"${tarea.titulo}" (${tarea.proyecto}): ${comentario || `estado cambiado a ${estado}`}`.slice(0, 500),
      tipo: "seguimiento", entidadID: tarea.tareaID, entidadTipo: "tarea",
    });
    ctx.response.status = 201;
    ctx.response.body = { mensaje: "Seguimiento registrado", avanceProyecto: avance };
  } catch (e) {
    console.error("Error en registrarSeguimiento:", e);
    error(ctx, 500, "No se pudo registrar el seguimiento");
  }
}

// GET /api/seguimiento/proyectos/:id   (Constructora): actividad reciente del proyecto
export async function actividadProyecto(ctx: any) {
  const proyecto = await proyectoPropio(ctx, Number(ctx.params.id));
  if (!proyecto) return error(ctx, 404, "Proyecto no encontrado");
  const entradas = await db.select({
    seguimientoID: seguimientotareas.seguimientoID, comentario: seguimientotareas.comentario,
    estadoNuevo: seguimientotareas.estadoNuevo, fecha: seguimientotareas.fecha, autor: usuarios.nombre,
    tareaID: tareasproyecto.tareaID, tarea: tareasproyecto.titulo,
  }).from(seguimientotareas)
    .innerJoin(tareasproyecto, eq(seguimientotareas.tareaID, tareasproyecto.tareaID))
    .innerJoin(usuarios, eq(seguimientotareas.usuarioID, usuarios.usuarioID))
    .where(eq(tareasproyecto.proyectoID, proyecto.proyectoID)).orderBy(desc(seguimientotareas.fecha)).limit(60);
  ctx.response.body = { actividad: entradas };
}

// ── Panel del trabajador ─────────────────────────────────────────────────────
// GET /api/trabajador/dashboard
export async function dashboardTrabajador(ctx: any) {
  const id = usuarioId(ctx);
  const [yo] = await db.select({
    nombre: usuarios.nombre, estado: usuarios.estadoCuenta, constructora: constructoras.nombre,
  }).from(usuarios).leftJoin(constructoras, eq(usuarios.constructoraID, constructoras.constructoraID))
    .where(and(eq(usuarios.usuarioID, id), eq(usuarios.rolID, ROL_TRABAJADOR))).limit(1);
  if (!yo) return error(ctx, 403, "Esta cuenta no es de trabajador");
  if (yo.estado !== "Activa") return error(ctx, 403, "Cuenta inactiva");

  const tareas = await db.select({
    tareaID: tareasproyecto.tareaID, titulo: tareasproyecto.titulo, descripcion: tareasproyecto.descripcion,
    estado: tareasproyecto.estado, prioridad: tareasproyecto.prioridad, fechaLimite: tareasproyecto.fechaLimite,
    fechaCompletada: tareasproyecto.fechaCompletada, proyectoID: proyectos.proyectoID, proyecto: proyectos.nombre,
    etapa: etapasproyecto.nombre, avanceProyecto: proyectos.porcentajeAvance,
  }).from(tareasproyecto)
    .innerJoin(proyectos, eq(tareasproyecto.proyectoID, proyectos.proyectoID))
    .innerJoin(etapasproyecto, eq(tareasproyecto.etapaID, etapasproyecto.etapaID))
    .where(eq(tareasproyecto.asignadoA, id)).orderBy(asc(tareasproyecto.fechaLimite), asc(tareasproyecto.tareaID));

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const abiertas = tareas.filter((t) => t.estado !== "Completada");
  ctx.response.body = {
    trabajador: { nombre: yo.nombre, constructora: yo.constructora },
    resumen: {
      pendientes: tareas.filter((t) => t.estado === "Pendiente").length,
      enProgreso: tareas.filter((t) => t.estado === "En progreso").length,
      completadas: tareas.filter((t) => t.estado === "Completada").length,
      vencidas: abiertas.filter((t) => t.fechaLimite && new Date(t.fechaLimite) < hoy).length,
    },
    tareas,
  };
}

// GET /api/trabajador/grupo
export async function grupoTrabajador(ctx: any) {
  const id = usuarioId(ctx);
  const [yo] = await db.select({
    usuarioID: usuarios.usuarioID,
    nombre: usuarios.nombre,
    estado: usuarios.estadoCuenta,
    constructoraID: usuarios.constructoraID,
  }).from(usuarios).where(and(eq(usuarios.usuarioID, id), eq(usuarios.rolID, ROL_TRABAJADOR))).limit(1);
  if (!yo) return error(ctx, 403, "Esta cuenta no es de trabajador");

  let constructora: any = null;
  let supervisor: any = null;
  let integrantes: any[] = [];

  if (yo.constructoraID) {
    const [c] = await db.select({
      constructoraID: constructoras.constructoraID,
      nombre: constructoras.nombre,
      ciudad: constructoras.ciudad,
      telefono: constructoras.telefono,
      correo: constructoras.correo,
      usuarioID: constructoras.usuarioID,
    }).from(constructoras).where(eq(constructoras.constructoraID, yo.constructoraID)).limit(1);
    if (c) {
      constructora = {
        constructoraID: c.constructoraID,
        nombre: c.nombre,
        ciudad: c.ciudad,
        telefono: c.telefono,
        correo: c.correo,
      };
      if (c.usuarioID) {
        const [sup] = await db.select({
          usuarioID: usuarios.usuarioID,
          nombre: usuarios.nombre,
          correo: usuarios.correo,
          telefono: usuarios.telefono,
        }).from(usuarios).where(eq(usuarios.usuarioID, c.usuarioID)).limit(1);
        if (sup) supervisor = sup;
      }
    }

    const lista = await db.select({
      usuarioID: usuarios.usuarioID,
      nombre: usuarios.nombre,
      correo: usuarios.correo,
      telefono: usuarios.telefono,
      fotoPerfil: usuarios.fotoPerfil,
      estadoCuenta: usuarios.estadoCuenta,
    }).from(usuarios)
      .where(and(eq(usuarios.rolID, ROL_TRABAJADOR), eq(usuarios.constructoraID, yo.constructoraID), eq(usuarios.estadoCuenta, "Activa")))
      .orderBy(asc(usuarios.nombre));
    integrantes = lista.map((t) => ({ ...t, rol: "Trabajador", esYo: t.usuarioID === id }));
  }

  const mias = await db.select({
    solicitudID: trabajadoressolicitud.solicitudID,
    fechaAsignacion: trabajadoressolicitud.fechaAsignacion,
  }).from(trabajadoressolicitud).where(eq(trabajadoressolicitud.trabajadorID, id));

  let asignaciones: any[] = [];
  if (mias.length) {
    const ids = mias.map((m) => m.solicitudID);
    const fechaPorId = new Map(mias.map((m) => [m.solicitudID, m.fechaAsignacion]));
    const sols = await db.select({
      solicitudID: serviciossolicitados.solicitudID,
      servicio: serviciosmantenimiento.nombre,
      estado: estadosreparacion.descripcion,
      estadoReparacionID: serviciossolicitados.estadoReparacionID,
      propiedad: propiedades.titulo,
      ciudad: propiedades.ciudad,
      fechaSolicitud: serviciossolicitados.fechaSolicitud,
    }).from(serviciossolicitados)
      .innerJoin(serviciosmantenimiento, eq(serviciossolicitados.servicioID, serviciosmantenimiento.servicioID))
      .leftJoin(estadosreparacion, eq(serviciossolicitados.estadoReparacionID, estadosreparacion.estadoReparacionID))
      .leftJoin(propiedades, eq(serviciossolicitados.propiedadID, propiedades.propiedadID))
      .where(inArray(serviciossolicitados.solicitudID, ids))
      .orderBy(desc(serviciossolicitados.fechaSolicitud));

    const compas = await db.select({
      solicitudID: trabajadoressolicitud.solicitudID,
      usuarioID: usuarios.usuarioID,
      nombre: usuarios.nombre,
      telefono: usuarios.telefono,
    }).from(trabajadoressolicitud)
      .innerJoin(usuarios, eq(trabajadoressolicitud.trabajadorID, usuarios.usuarioID))
      .where(inArray(trabajadoressolicitud.solicitudID, ids));

    asignaciones = sols.map((s) => ({
      ...s,
      fechaAsignacion: fechaPorId.get(s.solicitudID) ?? null,
      integrantes: compas.filter((c) => c.solicitudID === s.solicitudID).map(({ solicitudID: _id, ...c }) => ({
        ...c,
        esYo: c.usuarioID === id,
      })),
    }));
  }

  ctx.response.body = {
    equipo: {
      nombre: constructora ? `Cuadrilla ${constructora.nombre}` : "Sin cuadrilla asignada",
      rol: "Trabajador",
      constructora,
      supervisor,
    },
    integrantes,
    asignaciones,
  };
}

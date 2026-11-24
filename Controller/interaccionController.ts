// deno-lint-ignore-file no-explicit-any
import { and, asc, desc, eq, inArray, sql } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import {
  agendas, avancesproyecto, calificaciones, comentarios, constructoras, estadosproyecto, favoritos, imagenespropiedad,
  imagenesproyecto, inmobiliarias, interespropiedad, propiedades, proyectos, serviciosmantenimiento, tiposoperacion, usuarios,
} from "../Model/schema.ts";
import { COOKIE_NAME, verificarToken } from "../Helpers/jwt.ts";
import { notificar } from "../services/notificaciones.ts";
import { obtenerInmobiliariaScope, ScopeError } from "../Middlewares/inmobiliariasScope.ts";

/**
 * Vista detallada (propiedad, proyecto, servicio), calificaciones, comentarios
 * y metricas de interes.
 */
type Tipo = "propiedad" | "servicio";
const usuarioId = (ctx: any) => Number(ctx.state.user?.sub);
const error = (ctx: any, status: number, mensaje: string) => {
  ctx.response.status = status;
  ctx.response.body = { error: mensaje };
};
const num = (v: string | null) => (v === null ? null : Number(v));

/** Sesion opcional: devuelve el usuarioID si hay cookie valida, o null */
async function usuarioOpcional(ctx: any): Promise<number | null> {
  const token = await ctx.cookies.get(COOKIE_NAME);
  if (!token) return null;
  const payload = await verificarToken(token);
  const id = Number(payload?.sub);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function resumenCalificacion(tipo: Tipo, id: number, usuario: number | null) {
  const col = tipo === "propiedad" ? calificaciones.propiedadID : calificaciones.servicioID;
  const [r] = await db.select({
    promedio: sql<string | null>`AVG(${calificaciones.puntaje})`, total: sql<number>`COUNT(*)`,
  }).from(calificaciones).where(eq(col, id));
  let mia: number | null = null;
  if (usuario) {
    const [m] = await db.select({ puntaje: calificaciones.puntaje }).from(calificaciones)
      .where(and(eq(col, id), eq(calificaciones.usuarioID, usuario))).limit(1);
    mia = m?.puntaje ?? null;
  }
  return { promedio: r?.promedio ? Math.round(Number(r.promedio) * 10) / 10 : null, total: Number(r?.total ?? 0), mia };
}

async function listaComentarios(tipo: Tipo, id: number, usuario: number | null) {
  const col = tipo === "propiedad" ? comentarios.propiedadID : comentarios.servicioID;
  const filas = await db.select({
    comentarioID: comentarios.comentarioID, contenido: comentarios.contenido, fecha: comentarios.fechaComentario,
    autor: usuarios.nombre, autorID: usuarios.usuarioID,
  }).from(comentarios).innerJoin(usuarios, eq(comentarios.usuarioID, usuarios.usuarioID))
    .where(eq(col, id)).orderBy(desc(comentarios.fechaComentario)).limit(100);
  return filas.map(({ autorID, ...c }) => ({ ...c, mio: usuario !== null && autorID === usuario }));
}

// GET /api/detalle/propiedad/:id   (publico; registra una "vista" para las metricas de interes)
export async function detallePropiedad(ctx: any) {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id)) return error(ctx, 400, "ID invalido");
  const [p] = await db.select({
    id: propiedades.propiedadID, titulo: propiedades.titulo, descripcion: propiedades.descripcion, precio: propiedades.precio,
    tipoOperacion: tiposoperacion.descripcion, habitaciones: propiedades.habitaciones, direccion: propiedades.direccion,
    ciudad: propiedades.ciudad, estado: propiedades.estado, fechaPublicacion: propiedades.fechaPublicacion,
    latitud: propiedades.latitud, longitud: propiedades.longitud,
    agente: usuarios.nombre, agenteTelefono: usuarios.telefono,
    inmobiliariaID: inmobiliarias.inmobiliariaID, inmobiliaria: inmobiliarias.nombre, constructora: constructoras.nombre,
  }).from(propiedades)
    .innerJoin(tiposoperacion, eq(propiedades.tipoOperacionID, tiposoperacion.tipoOperacionID))
    .leftJoin(usuarios, eq(propiedades.agenteID, usuarios.usuarioID))
    .leftJoin(inmobiliarias, eq(propiedades.inmobiliariaID, inmobiliarias.inmobiliariaID))
    .leftJoin(constructoras, eq(propiedades.constructoraID, constructoras.constructoraID))
    .where(eq(propiedades.propiedadID, id)).limit(1);
  if (!p || p.estado !== "Disponible") return error(ctx, 404, "Propiedad no encontrada");

  const usuario = await usuarioOpcional(ctx);
  const imgs = await db.select({ url: imagenespropiedad.url }).from(imagenespropiedad).where(eq(imagenespropiedad.propiedadID, id));
  db.insert(interespropiedad).values({ propiedadID: id, usuarioID: usuario, tipo: "vista" }).catch(() => {});
  let esFavorito = false;
  if (usuario) {
    const [f] = await db.select({ id: favoritos.favoritoID }).from(favoritos)
      .where(and(eq(favoritos.usuarioID, usuario), eq(favoritos.propiedadID, id))).limit(1);
    esFavorito = !!f;
  }
  ctx.response.body = {
    tipo: "propiedad", ...p, latitud: num(p.latitud), longitud: num(p.longitud),
    imagenes: imgs.map((i) => i.url), esFavorito, autenticado: usuario !== null,
    calificacion: await resumenCalificacion("propiedad", id, usuario),
    comentarios: await listaComentarios("propiedad", id, usuario),
  };
}

// GET /api/detalle/proyecto/:id   (publico)
export async function detalleProyecto(ctx: any) {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id)) return error(ctx, 400, "ID invalido");
  const [p] = await db.select({
    id: proyectos.proyectoID, titulo: proyectos.nombre, descripcion: proyectos.descripcion, ubicacion: proyectos.ubicacion,
    estado: estadosproyecto.descripcion, avance: proyectos.porcentajeAvance, fechaInicio: proyectos.fechaInicio,
    fechaFin: proyectos.fechaFin, latitud: proyectos.latitud, longitud: proyectos.longitud,
    constructora: constructoras.nombre, inmobiliaria: inmobiliarias.nombre,
  }).from(proyectos)
    .innerJoin(estadosproyecto, eq(proyectos.estadoProyectoID, estadosproyecto.estadoProyectoID))
    .leftJoin(constructoras, eq(proyectos.constructoraID, constructoras.constructoraID))
    .leftJoin(inmobiliarias, eq(proyectos.inmobiliariaID, inmobiliarias.inmobiliariaID))
    .where(eq(proyectos.proyectoID, id)).limit(1);
  if (!p) return error(ctx, 404, "Proyecto no encontrado");
  const imgs = await db.select({ url: imagenesproyecto.url }).from(imagenesproyecto).where(eq(imagenesproyecto.proyectoID, id));
  const avances = await db.select({ porcentaje: avancesproyecto.porcentaje, nota: avancesproyecto.nota, fecha: avancesproyecto.fechaRegistro })
    .from(avancesproyecto).where(eq(avancesproyecto.proyectoID, id)).orderBy(desc(avancesproyecto.fechaRegistro)).limit(10);
  ctx.response.body = {
    tipo: "proyecto", ...p, avance: Number(p.avance), latitud: num(p.latitud), longitud: num(p.longitud),
    imagenes: imgs.map((i) => i.url).filter(Boolean), avances, autenticado: (await usuarioOpcional(ctx)) !== null,
  };
}

// GET /api/detalle/servicio/:id   (publico)
export async function detalleServicio(ctx: any) {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id)) return error(ctx, 400, "ID invalido");
  const [s] = await db.select({
    id: serviciosmantenimiento.servicioID, titulo: serviciosmantenimiento.nombre, descripcion: serviciosmantenimiento.descripcion,
    precio: serviciosmantenimiento.precio, estado: serviciosmantenimiento.estado, imagen: serviciosmantenimiento.imagen,
    inmobiliariaID: inmobiliarias.inmobiliariaID, inmobiliaria: inmobiliarias.nombre,
  }).from(serviciosmantenimiento).leftJoin(inmobiliarias, eq(serviciosmantenimiento.inmobiliariaID, inmobiliarias.inmobiliariaID))
    .where(eq(serviciosmantenimiento.servicioID, id)).limit(1);
  if (!s || s.estado !== "Activo") return error(ctx, 404, "Servicio no encontrado");
  const usuario = await usuarioOpcional(ctx);
  const { imagen, ...resto } = s;
  ctx.response.body = {
    tipo: "servicio", ...resto, imagenes: imagen ? [imagen] : [], autenticado: usuario !== null,
    calificacion: await resumenCalificacion("servicio", id, usuario),
    comentarios: await listaComentarios("servicio", id, usuario),
  };
}

/** Datos del elemento calificado/comentado y a quien avisar */
async function destino(tipo: Tipo, id: number) {
  if (tipo === "propiedad") {
    const [p] = await db.select({
      titulo: propiedades.titulo, inmobiliariaID: propiedades.inmobiliariaID, agenteID: propiedades.agenteID, estado: propiedades.estado,
    }).from(propiedades).where(eq(propiedades.propiedadID, id)).limit(1);
    return p && p.estado === "Disponible" ? { titulo: p.titulo, inmobiliariaID: p.inmobiliariaID, agenteID: p.agenteID } : null;
  }
  const [s] = await db.select({
    titulo: serviciosmantenimiento.nombre, inmobiliariaID: serviciosmantenimiento.inmobiliariaID, estado: serviciosmantenimiento.estado,
  }).from(serviciosmantenimiento).where(eq(serviciosmantenimiento.servicioID, id)).limit(1);
  return s && s.estado === "Activo" ? { titulo: s.titulo, inmobiliariaID: s.inmobiliariaID, agenteID: null } : null;
}

async function adminsDe(inmobiliariaID: number | null): Promise<number[]> {
  if (!inmobiliariaID) return [];
  const filas = await db.select({ id: usuarios.usuarioID }).from(usuarios)
    .where(and(eq(usuarios.rolID, 1), eq(usuarios.inmobiliariaID, inmobiliariaID), eq(usuarios.estadoCuenta, "Activa")));
  return filas.map((f) => f.id);
}

function leerTipo(body: any): { tipo: Tipo; id: number } | null {
  const id = Number(body?.id);
  if ((body?.tipo !== "propiedad" && body?.tipo !== "servicio") || !Number.isInteger(id) || id <= 0) return null;
  return { tipo: body.tipo, id };
}

// POST /api/calificaciones  { tipo: "propiedad"|"servicio", id, puntaje: 1..5 }
export async function calificar(ctx: any) {
  try {
    const body = await ctx.request.body.json().catch(() => null);
    const ref = leerTipo(body);
    const puntaje = Number(body?.puntaje);
    if (!ref) return error(ctx, 400, "Indica que quieres calificar");
    if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) return error(ctx, 400, "La calificacion va de 1 a 5 estrellas");
    const d = await destino(ref.tipo, ref.id);
    if (!d) return error(ctx, 404, "No encontramos lo que quieres calificar");

    const usuario = usuarioId(ctx);
    const col = ref.tipo === "propiedad" ? calificaciones.propiedadID : calificaciones.servicioID;
    const [previa] = await db.select({ id: calificaciones.calificacionID }).from(calificaciones)
      .where(and(eq(col, ref.id), eq(calificaciones.usuarioID, usuario))).limit(1);
    if (previa) {
      await db.update(calificaciones).set({ puntaje, fechaCalificacion: new Date() }).where(eq(calificaciones.calificacionID, previa.id));
    } else {
      await db.insert(calificaciones).values({
        usuarioID: usuario, puntaje,
        propiedadID: ref.tipo === "propiedad" ? ref.id : null,
        servicioID: ref.tipo === "servicio" ? ref.id : null,
      });
    }
    const [autor] = await db.select({ nombre: usuarios.nombre }).from(usuarios).where(eq(usuarios.usuarioID, usuario)).limit(1);
    await notificar([...(await adminsDe(d.inmobiliariaID)), d.agenteID], {
      titulo: `Nueva calificacion: ${puntaje} de 5`,
      mensaje: `${autor?.nombre ?? "Un usuario"} califico ${ref.tipo === "propiedad" ? "la propiedad" : "el servicio"} "${d.titulo}" con ${puntaje} de 5 estrellas.`,
      tipo: "calificacion", entidadID: ref.id, entidadTipo: ref.tipo,
    });
    ctx.response.body = { mensaje: previa ? "Calificacion actualizada" : "Gracias por tu calificacion", calificacion: await resumenCalificacion(ref.tipo, ref.id, usuario) };
  } catch (e) {
    console.error("Error en calificar:", e);
    error(ctx, 500, "No se pudo guardar la calificacion");
  }
}

// POST /api/comentarios  { tipo, id, contenido }
export async function comentar(ctx: any) {
  try {
    const body = await ctx.request.body.json().catch(() => null);
    const ref = leerTipo(body);
    const contenido = String(body?.contenido ?? "").trim();
    if (!ref) return error(ctx, 400, "Indica donde quieres comentar");
    if (contenido.length < 3 || contenido.length > 1000) return error(ctx, 400, "El comentario debe tener entre 3 y 1000 caracteres");
    const d = await destino(ref.tipo, ref.id);
    if (!d) return error(ctx, 404, "No encontramos donde quieres comentar");

    const usuario = usuarioId(ctx);
    await db.insert(comentarios).values({
      usuarioID: usuario, contenido,
      propiedadID: ref.tipo === "propiedad" ? ref.id : null,
      servicioID: ref.tipo === "servicio" ? ref.id : null,
    });
    const [autor] = await db.select({ nombre: usuarios.nombre }).from(usuarios).where(eq(usuarios.usuarioID, usuario)).limit(1);
    await notificar([...(await adminsDe(d.inmobiliariaID)), d.agenteID], {
      titulo: "Nuevo comentario",
      mensaje: `${autor?.nombre ?? "Un usuario"} comento en ${ref.tipo === "propiedad" ? "la propiedad" : "el servicio"} "${d.titulo}": ${contenido}`.slice(0, 500),
      tipo: "comentario", entidadID: ref.id, entidadTipo: ref.tipo,
    });
    ctx.response.status = 201;
    ctx.response.body = { mensaje: "Comentario publicado", comentarios: await listaComentarios(ref.tipo, ref.id, usuario) };
  } catch (e) {
    console.error("Error en comentar:", e);
    error(ctx, 500, "No se pudo publicar el comentario");
  }
}

// DELETE /api/comentarios/:id   (el autor, o el administrador de la inmobiliaria dueña)
export async function eliminarComentario(ctx: any) {
  const id = Number(ctx.params.id);
  const [c] = await db.select({
    comentarioID: comentarios.comentarioID, usuarioID: comentarios.usuarioID,
    inmoProp: propiedades.inmobiliariaID, inmoServ: serviciosmantenimiento.inmobiliariaID,
  }).from(comentarios)
    .leftJoin(propiedades, eq(comentarios.propiedadID, propiedades.propiedadID))
    .leftJoin(serviciosmantenimiento, eq(comentarios.servicioID, serviciosmantenimiento.servicioID))
    .where(eq(comentarios.comentarioID, id)).limit(1);
  if (!c) return error(ctx, 404, "Comentario no encontrado");
  let permitido = c.usuarioID === usuarioId(ctx);
  if (!permitido && ctx.state.user?.rol === "Administrador") {
    try {
      const scope = await obtenerInmobiliariaScope(ctx);
      permitido = scope.inmobiliariaId === (c.inmoProp ?? c.inmoServ);
    } catch (e) { if (!(e instanceof ScopeError)) throw e; }
  }
  if (!permitido) return error(ctx, 403, "No puedes eliminar este comentario");
  await db.delete(comentarios).where(eq(comentarios.comentarioID, id));
  ctx.response.body = { mensaje: "Comentario eliminado" };
}

// POST /api/interes  { propiedadID, tipo: "mapa" }   (publico; clic en "Ver en mapa")
export async function registrarInteres(ctx: any) {
  const body = await ctx.request.body.json().catch(() => null);
  const id = Number(body?.propiedadID);
  if (!Number.isInteger(id) || body?.tipo !== "mapa") return error(ctx, 400, "Solicitud invalida");
  const [p] = await db.select({ id: propiedades.propiedadID }).from(propiedades).where(eq(propiedades.propiedadID, id)).limit(1);
  if (!p) return error(ctx, 404, "Propiedad no encontrada");
  await db.insert(interespropiedad).values({ propiedadID: id, usuarioID: await usuarioOpcional(ctx), tipo: "mapa" });
  ctx.response.status = 204;
}

// GET /api/admin/interes   (Administrador): metricas de interes de las propiedades de SU inmobiliaria
export async function metricasInteres(ctx: any) {
  try {
    const scope = await obtenerInmobiliariaScope(ctx);
    const props = await db.select({
      propiedadID: propiedades.propiedadID, titulo: propiedades.titulo, ciudad: propiedades.ciudad, estado: propiedades.estado,
      agente: usuarios.nombre,
    }).from(propiedades).leftJoin(usuarios, eq(propiedades.agenteID, usuarios.usuarioID))
      .where(eq(propiedades.inmobiliariaID, scope.inmobiliariaId)).orderBy(asc(propiedades.titulo));
    const ids = props.map((p) => p.propiedadID);
    if (!ids.length) { ctx.response.body = { propiedades: [] }; return; }

    const porId = <T extends { propiedadID: number | null }>(filas: T[]) => new Map(filas.map((f) => [f.propiedadID, f]));
    const vistas = porId(await db.select({
      propiedadID: interespropiedad.propiedadID,
      vistas: sql<number>`SUM(CASE WHEN ${interespropiedad.tipo} = 'vista' THEN 1 ELSE 0 END)`,
      mapa: sql<number>`SUM(CASE WHEN ${interespropiedad.tipo} = 'mapa' THEN 1 ELSE 0 END)`,
      unicos: sql<number>`COUNT(DISTINCT ${interespropiedad.usuarioID})`,
    }).from(interespropiedad).where(inArray(interespropiedad.propiedadID, ids)).groupBy(interespropiedad.propiedadID));
    const favs = porId(await db.select({ propiedadID: favoritos.propiedadID, n: sql<number>`COUNT(*)` })
      .from(favoritos).where(inArray(favoritos.propiedadID, ids)).groupBy(favoritos.propiedadID));
    const citas = porId(await db.select({ propiedadID: agendas.propiedadID, n: sql<number>`COUNT(*)` })
      .from(agendas).where(inArray(agendas.propiedadID, ids)).groupBy(agendas.propiedadID));
    const coms = porId(await db.select({ propiedadID: comentarios.propiedadID, n: sql<number>`COUNT(*)` })
      .from(comentarios).where(inArray(comentarios.propiedadID, ids)).groupBy(comentarios.propiedadID));
    const cals = porId(await db.select({
      propiedadID: calificaciones.propiedadID, n: sql<number>`COUNT(*)`, promedio: sql<string | null>`AVG(${calificaciones.puntaje})`,
    }).from(calificaciones).where(inArray(calificaciones.propiedadID, ids)).groupBy(calificaciones.propiedadID));

    ctx.response.body = {
      propiedades: props.map((p) => {
        const v = vistas.get(p.propiedadID), c = cals.get(p.propiedadID);
        const fila = {
          ...p,
          vistas: Number(v?.vistas ?? 0), clicsMapa: Number(v?.mapa ?? 0), usuariosUnicos: Number(v?.unicos ?? 0),
          guardados: Number(favs.get(p.propiedadID)?.n ?? 0), citas: Number(citas.get(p.propiedadID)?.n ?? 0),
          comentarios: Number(coms.get(p.propiedadID)?.n ?? 0), calificaciones: Number(c?.n ?? 0),
          promedio: c?.promedio ? Math.round(Number(c.promedio) * 10) / 10 : null,
        };
        return { ...fila, interesTotal: fila.vistas + fila.clicsMapa + fila.guardados + fila.citas + fila.comentarios + fila.calificaciones };
      }),
    };
  } catch (e) {
    if (e instanceof ScopeError) return error(ctx, e.status, e.message);
    console.error("Error en metricasInteres:", e);
    error(ctx, 500, "No se pudieron cargar las metricas");
  }
}

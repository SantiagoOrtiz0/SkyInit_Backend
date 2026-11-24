// deno-lint-ignore-file no-explicit-any
import { and, eq, inArray, isNotNull } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import { constructoras, imagenespropiedad, imagenesproyecto, propiedades, proyectos, usuarios } from "../Model/schema.ts";

const usuarioId = (ctx: any) => Number(ctx.state.user?.sub);
const error = (ctx: any, status: number, mensaje: string) => {
  ctx.response.status = status;
  ctx.response.body = { error: mensaje };
};

function agrupar<T extends { id: number; url: string | null }>(filas: T[]): Map<number, string[]> {
  const mapa = new Map<number, string[]>();
  for (const f of filas) {
    if (!f.url) continue;
    if (!mapa.has(f.id)) mapa.set(f.id, []);
    mapa.get(f.id)!.push(f.url);
  }
  return mapa;
}

// ── Galeria de fotos (publica) ───────────────────────────────────────────────
// GET /api/galeria?tipo=propiedad|proyecto
export async function galeria(ctx: any) {
  const tipo = ctx.request.url.searchParams.get("tipo");
  const albumes: any[] = [];

  if (tipo !== "proyecto") {
    const props = await db.select({
      id: propiedades.propiedadID, titulo: propiedades.titulo, ciudad: propiedades.ciudad,
    }).from(propiedades).where(eq(propiedades.estado, "Disponible"));
    if (props.length) {
      const imgs = agrupar(await db.select({ id: imagenespropiedad.propiedadID, url: imagenespropiedad.url })
        .from(imagenespropiedad).where(inArray(imagenespropiedad.propiedadID, props.map((p) => p.id))));
      for (const p of props) {
        const fotos = imgs.get(p.id);
        if (fotos?.length) albumes.push({ tipo: "propiedad", ...p, imagenes: fotos });
      }
    }
  }
  if (tipo !== "propiedad") {
    const proys = await db.select({
      id: proyectos.proyectoID, titulo: proyectos.nombre, ciudad: proyectos.ubicacion,
    }).from(proyectos);
    if (proys.length) {
      const imgs = agrupar(await db.select({ id: imagenesproyecto.proyectoID, url: imagenesproyecto.url })
        .from(imagenesproyecto).where(inArray(imagenesproyecto.proyectoID, proys.map((p) => p.id))));
      for (const p of proys) {
        const fotos = imgs.get(p.id);
        if (fotos?.length) albumes.push({ tipo: "proyecto", ...p, imagenes: fotos });
      }
    }
  }
  ctx.response.body = { albumes, totalFotos: albumes.reduce((n, a) => n + a.imagenes.length, 0) };
}

// ── Geolocalizacion ──────────────────────────────────────────────────────────
// GET /api/geo/puntos  (publico): todo lo que tiene coordenadas
export async function puntosMapa(ctx: any) {
  const props = await db.select({
    id: propiedades.propiedadID, titulo: propiedades.titulo, precio: propiedades.precio, ciudad: propiedades.ciudad,
    direccion: propiedades.direccion, latitud: propiedades.latitud, longitud: propiedades.longitud,
  }).from(propiedades).where(and(eq(propiedades.estado, "Disponible"), isNotNull(propiedades.latitud), isNotNull(propiedades.longitud)));
  const proys = await db.select({
    id: proyectos.proyectoID, titulo: proyectos.nombre, ubicacion: proyectos.ubicacion, avance: proyectos.porcentajeAvance,
    latitud: proyectos.latitud, longitud: proyectos.longitud,
  }).from(proyectos).where(and(isNotNull(proyectos.latitud), isNotNull(proyectos.longitud)));
  const num = (v: string | null) => Number(v);
  ctx.response.body = {
    propiedades: props.map((p) => ({ ...p, latitud: num(p.latitud), longitud: num(p.longitud) })),
    proyectos: proys.map((p) => ({ ...p, latitud: num(p.latitud), longitud: num(p.longitud) })),
  };
}

/** Propiedades y proyectos cuya ubicacion puede editar el usuario autenticado */
async function alcance(ctx: any) {
  const [u] = await db.select({
    usuarioID: usuarios.usuarioID, rolID: usuarios.rolID, inmobiliariaID: usuarios.inmobiliariaID, estado: usuarios.estadoCuenta,
  }).from(usuarios).where(eq(usuarios.usuarioID, usuarioId(ctx))).limit(1);
  if (!u || u.estado !== "Activa") return null;
  if (u.rolID === 1 && u.inmobiliariaID) {
    return { prop: eq(propiedades.inmobiliariaID, u.inmobiliariaID), proy: eq(proyectos.inmobiliariaID, u.inmobiliariaID) };
  }
  if (u.rolID === 2 && u.inmobiliariaID) {
    return { prop: and(eq(propiedades.agenteID, u.usuarioID), eq(propiedades.inmobiliariaID, u.inmobiliariaID))!, proy: null };
  }
  if (u.rolID === 5) {
    const [c] = await db.select({ id: constructoras.constructoraID, estado: constructoras.estado })
      .from(constructoras).where(eq(constructoras.usuarioID, u.usuarioID)).limit(1);
    if (!c || c.estado !== "Activo") return null;
    return { prop: eq(propiedades.constructoraID, c.id), proy: eq(proyectos.constructoraID, c.id) };
  }
  return null;
}

// GET /api/geo/editables  (Administrador, Agente, Constructora)
export async function editablesMapa(ctx: any) {
  const a = await alcance(ctx);
  if (!a) return error(ctx, 403, "Tu cuenta no puede editar ubicaciones");
  const props = await db.select({
    id: propiedades.propiedadID, titulo: propiedades.titulo, direccion: propiedades.direccion, ciudad: propiedades.ciudad,
    latitud: propiedades.latitud, longitud: propiedades.longitud,
  }).from(propiedades).where(a.prop);
  const proys = a.proy
    ? await db.select({
      id: proyectos.proyectoID, titulo: proyectos.nombre, direccion: proyectos.ubicacion,
      latitud: proyectos.latitud, longitud: proyectos.longitud,
    }).from(proyectos).where(a.proy)
    : [];
  const num = (v: string | null) => (v === null ? null : Number(v));
  ctx.response.body = {
    propiedades: props.map((p) => ({ ...p, latitud: num(p.latitud), longitud: num(p.longitud) })),
    proyectos: proys.map((p) => ({ ...p, latitud: num(p.latitud), longitud: num(p.longitud) })),
  };
}

function leerCoordenadas(body: any): { latitud: string | null; longitud: string | null } | null {
  if (body?.latitud === null && body?.longitud === null) return { latitud: null, longitud: null };
  const lat = Number(body?.latitud), lng = Number(body?.longitud);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitud: lat.toFixed(7), longitud: lng.toFixed(7) };
}

// PUT /api/geo/propiedades/:id  { latitud, longitud }   (null, null borra la ubicacion)
export async function ubicarPropiedad(ctx: any) {
  const id = Number(ctx.params.id);
  const coords = leerCoordenadas(await ctx.request.body.json().catch(() => null));
  if (!Number.isInteger(id) || !coords) return error(ctx, 400, "Coordenadas invalidas");
  const a = await alcance(ctx);
  if (!a) return error(ctx, 403, "Tu cuenta no puede editar ubicaciones");
  const [res] = await db.update(propiedades).set(coords).where(and(eq(propiedades.propiedadID, id), a.prop));
  if (!res.affectedRows) {
    const [existe] = await db.select({ id: propiedades.propiedadID }).from(propiedades).where(and(eq(propiedades.propiedadID, id), a.prop)).limit(1);
    if (!existe) return error(ctx, 403, "No tienes permisos sobre esta propiedad");
  }
  ctx.response.body = { mensaje: "Ubicacion guardada" };
}

// PUT /api/geo/proyectos/:id  { latitud, longitud }
export async function ubicarProyecto(ctx: any) {
  const id = Number(ctx.params.id);
  const coords = leerCoordenadas(await ctx.request.body.json().catch(() => null));
  if (!Number.isInteger(id) || !coords) return error(ctx, 400, "Coordenadas invalidas");
  const a = await alcance(ctx);
  if (!a || !a.proy) return error(ctx, 403, "Tu cuenta no puede editar la ubicacion de proyectos");
  const [res] = await db.update(proyectos).set(coords).where(and(eq(proyectos.proyectoID, id), a.proy));
  if (!res.affectedRows) {
    const [existe] = await db.select({ id: proyectos.proyectoID }).from(proyectos).where(and(eq(proyectos.proyectoID, id), a.proy)).limit(1);
    if (!existe) return error(ctx, 403, "No tienes permisos sobre este proyecto");
  }
  ctx.response.body = { mensaje: "Ubicacion guardada" };
}

// deno-lint-ignore-file no-explicit-any
import { and, asc, bcrypt, eq, ne, sql } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import { usuarios } from "../Model/schema.ts";
import { obtenerInmobiliariaScope, ScopeError } from "../Middlewares/inmobiliariasScope.ts";

/** Gestion de agentes por el Administrador: siempre dentro de SU inmobiliaria. */
const ROL_AGENTE = 2;
const REGEX_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const MSG_PASSWORD = "La contraseña debe tener minimo 8 caracteres, mayuscula, minuscula, numero y caracter especial";
const error = (ctx: any, status: number, mensaje: string) => {
  ctx.response.status = status;
  ctx.response.body = { error: mensaje };
};

async function conScope(ctx: any, accion: (inmobiliariaId: number) => Promise<void>) {
  try {
    const scope = await obtenerInmobiliariaScope(ctx);
    await accion(scope.inmobiliariaId);
  } catch (e) {
    if (e instanceof ScopeError) return error(ctx, e.status, e.message);
    console.error("Error en gestion de agentes:", e);
    error(ctx, 500, "No se pudo completar la operacion");
  }
}
const deMiInmobiliaria = (id: number, inmo: number) =>
  and(eq(usuarios.usuarioID, id), eq(usuarios.rolID, ROL_AGENTE), eq(usuarios.inmobiliariaID, inmo));

// GET /api/admin/agentes
export const listarAgentesInmobiliaria = (ctx: any) => conScope(ctx, async (inmo) => {
  const lista = await db.select({
    usuarioID: usuarios.usuarioID, nombre: usuarios.nombre, correo: usuarios.correo, telefono: usuarios.telefono,
    estadoCuenta: usuarios.estadoCuenta, fotoPerfil: usuarios.fotoPerfil, fechaRegistro: usuarios.fechaRegistro,
    propiedades: sql<number>`(SELECT COUNT(*) FROM propiedades p WHERE p.AgenteID = ${usuarios.usuarioID})`,
    citasPendientes: sql<number>`(SELECT COUNT(*) FROM agendas a JOIN propiedades p ON p.PropiedadID = a.PropiedadID
                                  WHERE p.AgenteID = ${usuarios.usuarioID} AND a.EstadoAgendaID = 1)`,
  }).from(usuarios).where(and(eq(usuarios.rolID, ROL_AGENTE), eq(usuarios.inmobiliariaID, inmo))).orderBy(asc(usuarios.nombre));
  ctx.response.body = { agentes: lista.map((a) => ({ ...a, propiedades: Number(a.propiedades), citasPendientes: Number(a.citasPendientes) })) };
});

// POST /api/admin/agentes  { nombre, correo, password, telefono? }
export const crearAgente = (ctx: any) => conScope(ctx, async (inmo) => {
  const body = await ctx.request.body.json().catch(() => ({}));
  const nombre = String(body.nombre ?? "").trim();
  const correo = String(body.correo ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!nombre || nombre.length > 100) return error(ctx, 400, "El nombre es obligatorio");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 100) return error(ctx, 400, "Correo invalido");
  if (!REGEX_PASSWORD.test(password)) return error(ctx, 400, MSG_PASSWORD);
  const [existe] = await db.select({ id: usuarios.usuarioID }).from(usuarios).where(eq(usuarios.correo, correo)).limit(1);
  if (existe) return error(ctx, 409, "Ya existe una cuenta con ese correo");

  const [res] = await db.insert(usuarios).values({
    nombre, correo, contrasenaHash: await bcrypt.hash(password),
    telefono: body.telefono ? String(body.telefono).trim().slice(0, 20) : null,
    rolID: ROL_AGENTE, inmobiliariaID: inmo, estadoCuenta: "Activa", aceptoTerminos: 1,
  });
  ctx.response.status = 201;
  ctx.response.body = { mensaje: "Agente creado", usuarioID: Number(res.insertId) };
});

// PUT /api/admin/agentes/:id  { nombre?, correo?, telefono?, password? }
export const editarAgente = (ctx: any) => conScope(ctx, async (inmo) => {
  const id = Number(ctx.params.id);
  const [agente] = await db.select({ id: usuarios.usuarioID }).from(usuarios).where(deMiInmobiliaria(id, inmo)).limit(1);
  if (!agente) return error(ctx, 404, "Agente no encontrado en tu inmobiliaria");
  const body = await ctx.request.body.json().catch(() => ({}));
  const datos: Record<string, unknown> = {};
  if (body.nombre !== undefined) {
    const nombre = String(body.nombre).trim();
    if (!nombre || nombre.length > 100) return error(ctx, 400, "Nombre invalido");
    datos.nombre = nombre;
  }
  if (body.correo !== undefined) {
    const correo = String(body.correo).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 100) return error(ctx, 400, "Correo invalido");
    const [otro] = await db.select({ id: usuarios.usuarioID }).from(usuarios)
      .where(and(eq(usuarios.correo, correo), ne(usuarios.usuarioID, id))).limit(1);
    if (otro) return error(ctx, 409, "Ya existe una cuenta con ese correo");
    datos.correo = correo;
  }
  if (body.telefono !== undefined) datos.telefono = body.telefono ? String(body.telefono).trim().slice(0, 20) : null;
  if (body.password) {
    if (!REGEX_PASSWORD.test(String(body.password))) return error(ctx, 400, MSG_PASSWORD);
    datos.contrasenaHash = await bcrypt.hash(String(body.password));
  }
  if (Object.keys(datos).length) await db.update(usuarios).set(datos).where(deMiInmobiliaria(id, inmo));
  ctx.response.body = { mensaje: "Agente actualizado" };
});

// PATCH /api/admin/agentes/:id/estado  { estadoCuenta: "Activa" | "Inactiva" }
export const cambiarEstadoAgente = (ctx: any) => conScope(ctx, async (inmo) => {
  const id = Number(ctx.params.id);
  const body = await ctx.request.body.json().catch(() => ({}));
  if (!["Activa", "Inactiva"].includes(body.estadoCuenta)) return error(ctx, 400, "Estado invalido");
  const [agente] = await db.select({ id: usuarios.usuarioID }).from(usuarios).where(deMiInmobiliaria(id, inmo)).limit(1);
  if (!agente) return error(ctx, 404, "Agente no encontrado en tu inmobiliaria");
  await db.update(usuarios).set({ estadoCuenta: body.estadoCuenta }).where(deMiInmobiliaria(id, inmo));
  ctx.response.body = { mensaje: body.estadoCuenta === "Activa" ? "Agente activado" : "Agente desactivado" };
});

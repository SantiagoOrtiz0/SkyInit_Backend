// deno-lint-ignore-file no-explicit-any
import { and, bcrypt, eq, gt, inArray, isNull, sql } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import {
  agendas, constructoras, favoritos, notificaciones, propiedades, proyectos, serviciossolicitados, trabajadoressolicitud, usuarios,
} from "../Model/schema.ts";

/** Operaciones de la cuenta comunes a todos los roles: cambio de contraseña y resumen para el dashboard. */
const REGEX_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const usuarioId = (ctx: any) => Number(ctx.state.user?.sub);
const error = (ctx: any, status: number, mensaje: string) => {
  ctx.response.status = status;
  ctx.response.body = { error: mensaje };
};
const contar = async (consulta: Promise<{ n: number }[]>) => Number((await consulta)[0]?.n ?? 0);
const N = { n: sql<number>`COUNT(*)` };

// PUT /api/cuenta/password  { actual, nueva, confirmar }   (cualquier rol)
export async function cambiarPassword(ctx: any) {
  try {
    const body = await ctx.request.body.json().catch(() => ({}));
    const actual = String(body.actual ?? ""), nueva = String(body.nueva ?? ""), confirmar = String(body.confirmar ?? "");
    if (!nueva || !confirmar) return error(ctx, 400, "Escribe la nueva contraseña y su confirmacion");
    if (nueva !== confirmar) return error(ctx, 400, "La nueva contraseña y su confirmacion no coinciden");
    if (!REGEX_PASSWORD.test(nueva)) {
      return error(ctx, 400, "La contraseña debe tener minimo 8 caracteres, mayuscula, minuscula, numero y caracter especial");
    }
    const [u] = await db.select({ hash: usuarios.contrasenaHash, estado: usuarios.estadoCuenta })
      .from(usuarios).where(eq(usuarios.usuarioID, usuarioId(ctx))).limit(1);
    if (!u || u.estado !== "Activa") return error(ctx, 403, "Cuenta no disponible");
    // Las cuentas creadas con Google no tienen contraseña local: pueden definir una sin la actual
    if (u.hash) {
      if (!actual) return error(ctx, 400, "Escribe tu contraseña actual");
      if (!(await bcrypt.compare(actual, u.hash))) return error(ctx, 400, "La contraseña actual no es correcta");
      if (await bcrypt.compare(nueva, u.hash)) return error(ctx, 400, "La nueva contraseña debe ser distinta de la actual");
    }
    await db.update(usuarios).set({ contrasenaHash: await bcrypt.hash(nueva) }).where(eq(usuarios.usuarioID, usuarioId(ctx)));
    ctx.response.body = { mensaje: "Contraseña actualizada" };
  } catch (e) {
    console.error("Error en cambiarPassword:", e);
    error(ctx, 500, "No se pudo cambiar la contraseña");
  }
}

// GET /api/cuenta/resumen   -> tarjetas del dashboard segun el rol
export async function resumenCuenta(ctx: any) {
  const id = usuarioId(ctx);
  const [u] = await db.select({
    rolID: usuarios.rolID, inmobiliariaID: usuarios.inmobiliariaID, constructoraID: usuarios.constructoraID,
  }).from(usuarios).where(eq(usuarios.usuarioID, id)).limit(1);
  if (!u) return error(ctx, 404, "Usuario no encontrado");

  const ahora = new Date();
  const tarjetas: { clave: string; etiqueta: string; valor: number; icono: string; enlace: string; alerta?: boolean }[] = [];
  const add = (clave: string, etiqueta: string, valor: number, icono: string, enlace: string, alerta = false) =>
    tarjetas.push({ clave, etiqueta, valor, icono, enlace, alerta: alerta && valor > 0 });

  const noLeidas = await contar(db.select(N).from(notificaciones).where(and(eq(notificaciones.usuarioID, id), eq(notificaciones.leida, 0))));

  if (u.rolID === 1 && u.inmobiliariaID) { // Administrador
    const inmo = u.inmobiliariaID;
    const citas = (estado: number) => contar(db.select(N).from(agendas).innerJoin(propiedades, eq(agendas.propiedadID, propiedades.propiedadID))
      .where(and(eq(propiedades.inmobiliariaID, inmo), eq(agendas.estadoAgendaID, estado))));
    add("citasPendientes", "Citas por confirmar", await citas(1), "bi-calendar-event", "/admin/agenda", true);
    add("citasConfirmadas", "Citas confirmadas", await citas(2), "bi-calendar-check", "/admin/agenda");
    add("sinReenviar", "Mantenimientos sin reenviar", await contar(db.select(N).from(serviciossolicitados).where(and(
      eq(serviciossolicitados.inmobiliariaID, inmo), isNull(serviciossolicitados.constructoraID),
      sql`COALESCE(${serviciossolicitados.estadoReparacionID}, 1) NOT IN (3, 6)`))), "bi-wrench-adjustable", "/admin/mantenimiento", true);
    add("agentes", "Agentes activos", await contar(db.select(N).from(usuarios).where(and(
      eq(usuarios.rolID, 2), eq(usuarios.inmobiliariaID, inmo), eq(usuarios.estadoCuenta, "Activa")))), "bi-person-badge", "/admin/agentes");
  } else if (u.rolID === 2 && u.inmobiliariaID) { // Agente
    const mias = and(eq(propiedades.inmobiliariaID, u.inmobiliariaID), sql`(${propiedades.agenteID} = ${id} OR ${agendas.agenteID} = ${id})`);
    const citas = (extra: any) => contar(db.select(N).from(agendas).innerJoin(propiedades, eq(agendas.propiedadID, propiedades.propiedadID)).where(and(mias, extra)));
    add("citasPendientes", "Citas por confirmar", await citas(eq(agendas.estadoAgendaID, 1)), "bi-calendar-event", "/agente/agenda", true);
    add("citasProximas", "Citas próximas", await citas(and(inArray(agendas.estadoAgendaID, [1, 2]), gt(agendas.fechaVisita, ahora))), "bi-calendar-check", "/agente/agenda");
    add("propiedades", "Propiedades a mi cargo", await contar(db.select(N).from(propiedades).where(eq(propiedades.agenteID, id))), "bi-house-door", "/agente/propiedades");
  } else if (u.rolID === 5) { // Constructora
    const [c] = await db.select({ id: constructoras.constructoraID }).from(constructoras).where(eq(constructoras.usuarioID, id)).limit(1);
    if (c) {
      add("sinGrupo", "Mantenimientos sin grupo", await contar(db.select(N).from(serviciossolicitados).where(and(
        eq(serviciossolicitados.constructoraID, c.id), sql`COALESCE(${serviciossolicitados.estadoReparacionID}, 1) NOT IN (3, 6)`,
        sql`NOT EXISTS (SELECT 1 FROM trabajadoressolicitud t WHERE t.SolicitudID = ${serviciossolicitados.solicitudID})`))),
        "bi-wrench-adjustable", "/constructora/mantenimiento", true);
      add("mantenimientos", "Mantenimientos recibidos", await contar(db.select(N).from(serviciossolicitados).where(eq(serviciossolicitados.constructoraID, c.id))), "bi-tools", "/constructora/mantenimiento");
      add("trabajadores", "Trabajadores activos", await contar(db.select(N).from(usuarios).where(and(
        eq(usuarios.rolID, 6), eq(usuarios.constructoraID, c.id), eq(usuarios.estadoCuenta, "Activa")))), "bi-people", "/constructora/trabajadores");
      add("proyectos", "Proyectos", await contar(db.select(N).from(proyectos).where(eq(proyectos.constructoraID, c.id))), "bi-buildings", "/constructora/proyectos");
    }
  } else if (u.rolID === 6) { // Trabajador
    add("trabajos", "Trabajos asignados", await contar(db.select(N).from(trabajadoressolicitud).where(eq(trabajadoressolicitud.trabajadorID, id))), "bi-tools", "/trabajador");
  } else if (u.rolID === 3) { // Usuario
    add("visitas", "Visitas activas", await contar(db.select(N).from(agendas).where(and(eq(agendas.usuarioID, id), inArray(agendas.estadoAgendaID, [1, 2])))), "bi-calendar-check", "/usuario/agenda");
    add("favoritos", "Favoritos", await contar(db.select(N).from(favoritos).where(eq(favoritos.usuarioID, id))), "bi-heart", "/usuario/favoritos");
    add("servicios", "Servicios en curso", await contar(db.select(N).from(serviciossolicitados).where(and(
      eq(serviciossolicitados.usuarioID, id), sql`COALESCE(${serviciossolicitados.estadoReparacionID}, 1) NOT IN (3, 6)`))), "bi-tools", "/usuario/solicitudes");
  } else if (u.rolID === 4) { // SuperAdmin
    add("citas", "Citas activas en la plataforma", await contar(db.select(N).from(agendas).where(inArray(agendas.estadoAgendaID, [1, 2]))), "bi-calendar-check", "/superadmin");
    add("mantenimientos", "Mantenimientos en curso", await contar(db.select(N).from(serviciossolicitados)
      .where(sql`COALESCE(${serviciossolicitados.estadoReparacionID}, 1) NOT IN (3, 6)`)), "bi-tools", "/superadmin");
    add("trabajadores", "Trabajadores", await contar(db.select(N).from(usuarios).where(eq(usuarios.rolID, 6))), "bi-people", "/superadmin/usuarios");
  }
  add("notificaciones", "Notificaciones sin leer", noLeidas, "bi-bell", "/notificaciones", true);
  ctx.response.body = { tarjetas };
}

// deno-lint-ignore-file no-explicit-any
import { and, desc, eq, sql } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import { notificaciones } from "../Model/schema.ts";

const usuarioId = (ctx: any) => Number(ctx.state.user?.sub);

// GET /api/notificaciones?soloNoLeidas=1
export async function listarNotificaciones(ctx: any) {
  const id = usuarioId(ctx);
  const soloNoLeidas = ctx.request.url.searchParams.get("soloNoLeidas") === "1";
  const filtro = soloNoLeidas
    ? and(eq(notificaciones.usuarioID, id), eq(notificaciones.leida, 0))
    : eq(notificaciones.usuarioID, id);
  const lista = await db.select().from(notificaciones).where(filtro)
    .orderBy(desc(notificaciones.fechaCreacion)).limit(50);
  const [{ total }] = await db.select({ total: sql<number>`COUNT(*)` }).from(notificaciones)
    .where(and(eq(notificaciones.usuarioID, id), eq(notificaciones.leida, 0)));
  ctx.response.body = { noLeidas: Number(total), notificaciones: lista };
}

// PATCH /api/notificaciones/:id/leida
export async function marcarLeida(ctx: any) {
  const idNotif = Number(ctx.params.id);
  if (!Number.isInteger(idNotif)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "ID invalido" };
    return;
  }
  await db.update(notificaciones).set({ leida: 1 })
    .where(and(eq(notificaciones.notificacionID, idNotif), eq(notificaciones.usuarioID, usuarioId(ctx))));
  ctx.response.body = { mensaje: "Notificacion marcada como leida" };
}

// POST /api/notificaciones/leer-todas
export async function marcarTodasLeidas(ctx: any) {
  await db.update(notificaciones).set({ leida: 1 })
    .where(and(eq(notificaciones.usuarioID, usuarioId(ctx)), eq(notificaciones.leida, 0)));
  ctx.response.body = { mensaje: "Todas las notificaciones quedaron leidas" };
}

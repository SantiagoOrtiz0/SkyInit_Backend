/**
 * agenteScope.ts
 * ─────────────────────────────────────────────────────────────────
 * Middleware de scope para el panel del agente.
 *
 * Responsabilidades:
 *  1. Leer el sub (usuarioID) del JWT ya verificado por authMiddleware.
 *  2. Confirmar que el usuario tiene RolID = 2 (Agente) o 1 (Administrador).
 *  3. Inyectar ctx.state.agenteID para que los controladores lo usen.
 *
 * Nota de diseño: el Administrador NO pasa por este middleware porque
 * usa listarPropiedadesAdmin desde su propio panel. Este scope es
 * exclusivo del panel de agente.
 * ─────────────────────────────────────────────────────────────────
 */
import type { Context, Next } from "../Dependencies/dependencias.ts";
import { eq } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import { usuarios } from "../Model/schema.ts";

// RolID de la tabla `roles` en la BD
const ROL_AGENTE = 2;

export async function agenteScopeMiddleware(
  ctx: Context,
  next: Next,
): Promise<void> {
  const jwt = (ctx.state as { user?: { sub?: string; rol?: string } }).user;
  const usuarioID = Number(jwt?.sub);

  if (!usuarioID || Number.isNaN(usuarioID)) {
    ctx.response.status = 401;
    ctx.response.body = { error: "No autenticado" };
    return;
  }

  // Verificar que el usuario existe y tiene el rol correcto
  const [usuario] = await db
    .select({
      usuarioID: usuarios.usuarioID,
      rolID: usuarios.rolID,
      estadoCuenta: usuarios.estadoCuenta,
      inmobiliariaID: usuarios.inmobiliariaID,
    })
    .from(usuarios)
    .where(eq(usuarios.usuarioID, usuarioID))
    .limit(1);

  if (!usuario) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Usuario no encontrado" };
    return;
  }

  if (usuario.estadoCuenta !== "Activa") {
    ctx.response.status = 403;
    ctx.response.body = { error: "Cuenta inactiva" };
    return;
  }

  if (usuario.rolID !== ROL_AGENTE) {
    ctx.response.status = 403;
    ctx.response.body = {
      error: "Acceso denegado: solo los agentes pueden acceder a este panel",
    };
    return;
  }

  // Inyectar el ID confirmado desde BD (no solo desde el token)
  (ctx.state as { agenteID?: number }).agenteID = usuario.usuarioID;
  (ctx.state as { inmobiliariaID?: number | null }).inmobiliariaID = usuario.inmobiliariaID ?? null;
  await next();
}

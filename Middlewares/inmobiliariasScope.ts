import type { Context } from "../Dependencies/dependencias.ts";
import { eq } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import { usuarios } from "../Model/schema.ts";

export interface InmobiliariaScope {
  inmobiliariaId: number;
  usuarioId: number;
  rolId: number;
}

export class ScopeError extends Error {
  public readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ScopeError";
  }
}

export async function obtenerInmobiliariaScope(
  ctx: Context,
): Promise<InmobiliariaScope> {
  const jwt = (ctx.state as { user?: { sub?: string } }).user;
  const usuarioId = Number(jwt?.sub);

  if (!usuarioId) {
    throw new ScopeError(401, "No autenticado");
  }

  const filas = await db
    .select({
      usuarioID: usuarios.usuarioID,
      rolID: usuarios.rolID,
      inmobiliariaID: usuarios.inmobiliariaID,
    })
    .from(usuarios)
    .where(eq(usuarios.usuarioID, usuarioId))
    .limit(1);

  const u = filas[0];
  if (!u) {
    throw new ScopeError(401, "Usuario no encontrado");
  }

  if (u.rolID === 4) {
    const raw = ctx.request.url.searchParams.get("inmobiliariaId");
    const id = Number(raw);
    if (!raw || !Number.isInteger(id) || id <= 0) {
      throw new ScopeError(
        403,
        "SuperAdmin debe indicar ?inmobiliariaId= válido para operar",
      );
    }
    return { inmobiliariaId: id, usuarioId: u.usuarioID, rolId: u.rolID };
  }

  if (u.rolID !== 1) {
    throw new ScopeError(
      403,
      "Solo el Administrador de una inmobiliaria puede operar este recurso",
    );
  }

  if (u.inmobiliariaID === null || u.inmobiliariaID === undefined) {
    throw new ScopeError(
      403,
      "El usuario Administrador no tiene una inmobiliaria asignada",
    );
  }

  return {
    inmobiliariaId: u.inmobiliariaID,
    usuarioId: u.usuarioID,
    rolId: u.rolID,
  };
}
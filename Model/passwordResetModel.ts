import { eq, and, gt } from "../Dependencies/dependencias.ts";
import { db } from "./conexion.ts";
import { passwordresettokens, usuarios } from "./schema.ts";

export async function borrarTokensUsuario(userId: number): Promise<void> {
  await db
    .delete(passwordresettokens)
    .where(eq(passwordresettokens.userId, userId));
}

export async function crearTokenReset(
  userId: number,
  token: string,
  expirationDate: Date,
): Promise<void> {
  // Un solo código activo por usuario
  await borrarTokensUsuario(userId);
  await db.insert(passwordresettokens).values({
    userId,
    token,
    expirationDate,
  });
}

export async function buscarTokenReset(token: string) {
  const ahora = new Date();
  const [fila] = await db
    .select()
    .from(passwordresettokens)
    .where(
      and(
        eq(passwordresettokens.token, token),
        gt(passwordresettokens.expirationDate, ahora),
      ),
    )
    .limit(1);
  return fila ?? null;
}

/** Código + usuario (por si dos códigos coinciden, casi nunca) */
export async function buscarCodigoReset(userId: number, codigo: string) {
  const ahora = new Date();
  const [fila] = await db
    .select()
    .from(passwordresettokens)
    .where(
      and(
        eq(passwordresettokens.userId, userId),
        eq(passwordresettokens.token, codigo),
        gt(passwordresettokens.expirationDate, ahora),
      ),
    )
    .limit(1);
  return fila ?? null;
}

export async function borrarTokenReset(token: string): Promise<void> {
  await db
    .delete(passwordresettokens)
    .where(eq(passwordresettokens.token, token));
}

export async function actualizarPassword(
  usuarioId: number,
  hash: string,
): Promise<void> {
  await db
    .update(usuarios)
    .set({ contrasenaHash: hash })
    .where(eq(usuarios.usuarioID, usuarioId));
}

/** Genera código numérico de 6 dígitos */
export function generarCodigo6(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}
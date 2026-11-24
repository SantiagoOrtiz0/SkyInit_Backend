import { eq, and, gt, lte, sql } from "../Dependencies/dependencias.ts";
import { db } from "./conexion.ts";
import { passwordresettokens, usuarios } from "./schema.ts";

/**
 * Recuperacion de contraseña en dos pasos:
 *   1. "codigo": 6 digitos enviados por correo. Maximo MAX_INTENTOS intentos.
 *   2. "token":  UUID que se entrega solo tras verificar el codigo y es lo
 *                unico que acepta /auth/restablecer-password.
 * En la BD solo se guarda el hash (SHA-256), nunca el valor en claro.
 */
export const MAX_INTENTOS = 5;
type TipoReset = "codigo" | "token";

async function hash(tipo: TipoReset, userId: number | null, valor: string): Promise<string> {
  const datos = new TextEncoder().encode(`${tipo}:${userId ?? ""}:${valor}`);
  const digest = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function borrarTokensUsuario(userId: number): Promise<void> {
  await db.delete(passwordresettokens).where(eq(passwordresettokens.userId, userId));
}

async function limpiarVencidos(): Promise<void> {
  await db.delete(passwordresettokens).where(lte(passwordresettokens.expirationDate, new Date()));
}

/** Paso 1: guarda el codigo de 6 digitos (un solo registro activo por usuario) */
export async function crearCodigoReset(userId: number, codigo: string, expirationDate: Date): Promise<void> {
  await limpiarVencidos();
  await borrarTokensUsuario(userId);
  await db.insert(passwordresettokens).values({
    userId,
    token: await hash("codigo", userId, codigo),
    tipo: "codigo",
    intentos: 0,
    expirationDate,
  });
}

/**
 * Paso 2: valida el codigo. Si es correcto lo cambia por un token final y lo devuelve.
 * Cada fallo suma un intento; al llegar a MAX_INTENTOS el codigo queda anulado.
 */
export async function canjearCodigoPorToken(userId: number, codigo: string): Promise<string | null> {
  const [fila] = await db
    .select()
    .from(passwordresettokens)
    .where(
      and(
        eq(passwordresettokens.userId, userId),
        eq(passwordresettokens.tipo, "codigo"),
        gt(passwordresettokens.expirationDate, new Date()),
      ),
    )
    .limit(1);
  if (!fila) return null;

  if (fila.token !== await hash("codigo", userId, codigo)) {
    if (fila.intentos + 1 >= MAX_INTENTOS) {
      await db.delete(passwordresettokens).where(eq(passwordresettokens.id, fila.id));
    } else {
      await db
        .update(passwordresettokens)
        .set({ intentos: sql`${passwordresettokens.intentos} + 1` })
        .where(eq(passwordresettokens.id, fila.id));
    }
    return null;
  }

  const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  await borrarTokensUsuario(userId);
  await db.insert(passwordresettokens).values({
    userId,
    token: await hash("token", null, token),
    tipo: "token",
    intentos: 0,
    expirationDate: new Date(Date.now() + 15 * 60 * 1000),
  });
  return token;
}

/** Paso 3: busca el token final (nunca acepta un codigo de 6 digitos) */
export async function buscarTokenReset(token: string) {
  const [fila] = await db
    .select()
    .from(passwordresettokens)
    .where(
      and(
        eq(passwordresettokens.token, await hash("token", null, String(token))),
        eq(passwordresettokens.tipo, "token"),
        gt(passwordresettokens.expirationDate, new Date()),
      ),
    )
    .limit(1);
  return fila ?? null;
}

export async function actualizarPassword(usuarioId: number, hashPassword: string): Promise<void> {
  await db.update(usuarios).set({ contrasenaHash: hashPassword }).where(eq(usuarios.usuarioID, usuarioId));
}

/** Genera codigo numerico de 6 digitos sin sesgo */
export function generarCodigo6(): string {
  const LIMITE = Math.floor(0xffffffff / 1_000_000) * 1_000_000;
  let n: number;
  do {
    n = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (n >= LIMITE);
  return String(n % 1_000_000).padStart(6, "0");
}

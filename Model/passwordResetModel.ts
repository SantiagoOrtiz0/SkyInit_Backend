import { eq, and, gt } from "../Dependencies/dependencias.ts";
import { db } from "./conexion.ts";
import { passwordresettokens, usuarios } from "./schema.ts";

/** Guardar token de recuperación (expira en 1 hora) */
export async function crearTokenReset(
    userId: number,
    token: string,
    expirationDate: Date,
    ): Promise<void> {
    await db.insert(passwordresettokens).values({
        userId,
        token,
        expirationDate,
    });
}

/** Buscar token que exista y no haya expirado */
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

/** Borrar token (un solo uso) */
export async function borrarTokenReset(token: string): Promise<void> {
    await db
        .delete(passwordresettokens)
        .where(eq(passwordresettokens.token, token));
}

/** Actualizar hash de contraseña del usuario */
export async function actualizarPassword(
    usuarioId: number,
    hash: string,
    ): Promise<void> {
    await db
        .update(usuarios)
        .set({ contrasenaHash: hash })
        .where(eq(usuarios.usuarioID, usuarioId));
}
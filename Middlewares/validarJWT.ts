import { verificarToken, COOKIE_NAME } from "../Helpers/jwt.ts";
import { Context, Next } from "../Dependencies/dependencias.ts";

export async function authMiddleware(ctx: Context, next: Next) {
    const token = await ctx.cookies.get(COOKIE_NAME);

    if (!token) {
        ctx.response.status = 401;
        ctx.response.body = { error: "No autorizado: sesión no encontrada" };
        return;
    }

    const usuario = await verificarToken(token);

    if (!usuario) {
        ctx.response.status = 401;
        ctx.response.body = { error: "Token inválido o expirado" };
        return;
    }

    ctx.state.user = usuario;
    await next();
}

export function rolMiddleware(...rolesPermitidos: string[]) {
    return async (ctx: Context, next: Next) => {
        const usuario = ctx.state.user as { rol?: string } | undefined;

        if (!usuario || !rolesPermitidos.includes(usuario.rol ?? "")) {
            ctx.response.status = 403;
            ctx.response.body = { error: "Acceso denegado: permisos insuficientes" };
            return;
        }

        await next();
    };
}
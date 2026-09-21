import { VerificarTokenAcceso } from "../Helpers/jwt.ts";
import { Context, Next } from "../Dependencies/dependencias.ts";

//Middleware para proteger rutas: exige un token valido en Authorization
export async function authMiddleware(ctx: Context, next: Next) {
    const authHeader = ctx.request.headers.get("Authorization");

    if (!authHeader) {
        ctx.response.status = 401;
        ctx.response.body = {error: "No tiene autorizacion"};
        return;
    }

    const token = authHeader.split(" ")[1];
    const usuario = await VerificarTokenAcceso(token);

    if (!usuario) {
        ctx.response.status = 401;
        ctx.response.body = {error: "Token invalido o expirado"};
        return; 
    }

    ctx.state.user = usuario;
    await next();
}

//Middleware exige que el usuario autenticado tenga rol Tecnico
export async function tecnicoMiddleware(ctx: Context, next: Next) {
    const usuario = ctx.state.user as {rol?: string} | undefined;

    if (!usuario || usuario.rol !== "Tecnico") {
        ctx.response.status = 403;
        ctx.response.body = {error: "Acceso restringido"};
        return;
    }

    await next();
}

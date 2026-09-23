import { Context, Next, eq } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import { constructoras } from "../Model/schema.ts";

export async function constructoraScopeMiddleware(ctx: Context, next: Next) {
    const usuario = ctx.state.user as { sub?: string } | undefined;
    const usuarioId = Number(usuario?.sub);

    if (!usuarioId) {
        ctx.response.status = 401;
        ctx.response.body = { success: false, message: "No autorizado" };
        return;
    }

    const [fila] = await db
        .select({
            constructoraID: constructoras.constructoraID,
            estado: constructoras.estado,
            nombre: constructoras.nombre,
        })
        .from(constructoras)
        .where(eq(constructoras.usuarioID, usuarioId))
        .limit(1);

    if (!fila) {
        ctx.response.status = 404;
        ctx.response.body = {
            success: false,
            message: "Esta cuenta no tiene una constructora asociada",
        };
        return;
    }

    if (fila.estado !== "Activo") {
        ctx.response.status = 403;
        ctx.response.body = {
            success: false,
            message: `Tu constructora esta en estado "${fila.estado}". Contacta a tu inmobiliaria.`,
        };
        return;
    }

    ctx.state.constructoraID = fila.constructoraID;
    ctx.state.constructoraNombre = fila.nombre;
    await next();
}

import { Context } from "../Dependencies/dependencias.ts";
import { obtenerServiciosActivos } from "../Model/serviciosModel.ts";

export async function getServicios(ctx: Context) {
    try {
        const servicios = await obtenerServiciosActivos();

        ctx.response.status = 200;
        ctx.response.body = {
            ok: true,
            data: servicios,
        };
    } catch (error) {
        console.error("[getServicios] Error al obtener servicios:", error);
        ctx.response.status = 500;
        ctx.response.body = {
            ok: false,
            message: "Error interno al obtener los servicios de mantenimiento.",
        };
    }
}

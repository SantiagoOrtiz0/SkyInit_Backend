import { Context } from "../Dependencies/dependencias.ts";
import { obtenerServiciosAgrupadosPorInmobiliaria } from "../Model/serviciosModel.ts";

// Catalogo publico de servicios de mantenimiento, agrupados por la inmobiliaria que los subio
export async function getServicios(ctx: Context) {
    try {
        const grupos = await obtenerServiciosAgrupadosPorInmobiliaria();

        ctx.response.status = 200;
        ctx.response.body = {
            ok: true,
            data: grupos,
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

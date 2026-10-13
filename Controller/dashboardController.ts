import { Context } from "../Dependencies/dependencias.ts";
import { obtenerResumenAdmin } from "../Model/dashboardModel.ts";

export const obtenerDashboardAdmin = async (ctx:Context) => {
    try {
        const resumen = await obtenerResumenAdmin();
        ctx.response.status = 200;
        ctx.response.body = resumen;
    } catch (error) {
        console.error(error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Error al obtener estadisticas del dashboard"};
    }
};
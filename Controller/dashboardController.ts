import { Context } from "../Dependencies/dependencias.ts";
import { obtenerResumenAdmin, obtenerResumenAgente, obtenerResumenSuperAdmin } from "../Model/dashboardModel.ts";
import { buscarPorId } from "../Model/usuarioModel.ts";

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

export const obtenerDashboardAgente = async (ctx: Context) => {
    try {
        const userState = ctx.state.user as { sub?: string };
        const usuarioId = Number(userState?.sub);
        if (!usuarioId) {
        ctx.response.status = 401;
        ctx.response.body = { error: "No autorizado" };
        return;
        }

        const usuario = await buscarPorId(usuarioId);
        const inmobiliariaID = Number(
        (usuario as { inmobiliariaID?: number })?.inmobiliariaID ?? 0,
        );

        if (!inmobiliariaID) {
        ctx.response.status = 200;
        ctx.response.body = {
            totales: {
            propiedades: 0,
            misPropiedades: 0,
            destacadas: 0,
            proyectos: 0,
            constructoras: 0,
            },
            propiedadesPorEstado: [],
            proyectosPorEstado: [],
            message: "El agente no tiene inmobiliaria asignada",
        };
        return;
        }

        const resumen = await obtenerResumenAgente(inmobiliariaID, usuarioId);
        ctx.response.status = 200;
        ctx.response.body = resumen;
    } catch (error) {
        console.error(error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Error al obtener dashboard del agente" };
    }
};

export const obtenerDashboardSuperAdmin = async (ctx: Context) => {
    try {
        const resumen = await obtenerResumenSuperAdmin();
        ctx.response.status = 200;
        ctx.response.body = resumen;
    } catch (error) {
        console.error(error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Error al obtener dashboard SuperAdmin" };
    }
};

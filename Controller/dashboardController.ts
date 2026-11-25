import { Context, eq } from "../Dependencies/dependencias.ts";
import { obtenerResumenInmobiliaria, obtenerResumenAgente, obtenerResumenSuperAdmin } from "../Model/dashboardModel.ts";
import { obtenerInmobiliariaScope, ScopeError } from "../Middlewares/inmobiliariasScope.ts";
import { buscarPorId } from "../Model/usuarioModel.ts";
import { db } from "../Model/conexion.ts";
import { constructoras, inmobiliarias } from "../Model/schema.ts";

export const obtenerDashboardAdmin = async (ctx:Context) => {
    try {
        const scope = await obtenerInmobiliariaScope(ctx);
        const resumen = await obtenerResumenInmobiliaria(scope.inmobiliariaId);
        ctx.response.status = 200;
        ctx.response.body = resumen;
    } catch (error) {
        if (error instanceof ScopeError) {
            ctx.response.status = error.status;
            ctx.response.body = { error: error.message };
            return;
        }
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

// PATCH /api/superadmin/aprobar  { tipo: "inmobiliaria" | "constructora", id: number }
export const aprobarEntidadPendiente = async (ctx: Context) => {
    try {
        const body = await ctx.request.body.json().catch(() => ({}));
        const tipo = String(body.tipo ?? "");
        const id = Number(body.id);
        if (!Number.isInteger(id) || id <= 0 || (tipo !== "inmobiliaria" && tipo !== "constructora")) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Datos invalidos para aprobar" };
            return;
        }
        if (tipo === "inmobiliaria") {
            await db.update(inmobiliarias).set({ estado: "Activa" }).where(eq(inmobiliarias.inmobiliariaID, id));
        } else {
            await db.update(constructoras).set({ estado: "Activo" }).where(eq(constructoras.constructoraID, id));
        }
        ctx.response.status = 200;
        ctx.response.body = { mensaje: tipo === "inmobiliaria" ? "Inmobiliaria activada" : "Constructora activada" };
    } catch (error) {
        console.error("Error en aprobarEntidadPendiente:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "No se pudo activar el registro" };
    }
};

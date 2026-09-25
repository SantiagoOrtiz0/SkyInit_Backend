import { Context } from "../Dependencies/dependencias.ts";
import {
    obtenerServiciosAgrupadosPorInmobiliaria,
    servicioActivoExiste,
    crearSolicitudServicio,
} from "../Model/serviciosModel.ts";

// Catalogo publico de servicios de mantenimiento, agrupados por la inmobiliaria que los subio
export async function getServicios(ctx: Context) {

    console.log("[getServicios] Request received for servicios catalogo");
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

// Solicitar un servicio de mantenimiento (Privado, requiere sesion activa)
export async function solicitarServicio(ctx: Context) {
    try {
        let body: any;
        try {
            body = await ctx.request.body.json();
        } catch {
            ctx.response.status = 400;
            ctx.response.body = { ok: false, message: "Cuerpo de la solicitud invalido." };
            return;
        }

        const { servicioId, servicioID, propiedadID, notas } = body ?? {};
        const idServicio = Number(servicioId ?? servicioID);

        if (!idServicio || Number.isNaN(idServicio)) {
            ctx.response.status = 400;
            ctx.response.body = { ok: false, message: "El servicioId es obligatorio y debe ser numerico." };
            return;
        }

        // El usuario viene del JWT (authMiddleware ya valido la sesion)
        const usuario = (ctx.state as any).user as { sub?: string } | undefined;
        const usuarioID = Number(usuario?.sub);

        if (!usuarioID || Number.isNaN(usuarioID)) {
            ctx.response.status = 401;
            ctx.response.body = { ok: false, message: "No fue posible identificar al usuario autenticado." };
            return;
        }

        const disponible = await servicioActivoExiste(idServicio);
        if (!disponible) {
            ctx.response.status = 404;
            ctx.response.body = { ok: false, message: "El servicio solicitado no existe o no esta disponible." };
            return;
        }

        const notasLimpias =
            typeof notas === "string" && notas.trim().length > 0 ? notas.trim() : null;

        const solicitudID = await crearSolicitudServicio({
            servicioID: idServicio,
            usuarioID,
            propiedadID: propiedadID ? Number(propiedadID) : null,
            notas: notasLimpias,
        });

        ctx.response.status = 201;
        ctx.response.body = {
            ok: true,
            message: "Solicitud enviada correctamente.",
            data: { solicitudID },
        };
    } catch (error) {
        console.error("[solicitarServicio] Error al crear la solicitud:", error);
        ctx.response.status = 500;
        ctx.response.body = {
            ok: false,
            message: "Error interno al enviar la solicitud del servicio.",
        };
    }
}

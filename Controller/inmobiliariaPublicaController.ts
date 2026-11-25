import { RouterContext } from "../Dependencies/dependencias.ts";
import {
    listarInmobiliariasPublicas,
    obtenerInmobiliariaPublicaPorId,
    obtenerServiciosActivosDeInmobiliaria,
} from "../Model/inmobiliariaPublicaModel.ts";

// GET /api/inmobiliarias
// Listado publico de inmobiliarias activas (sin autenticacion).
export async function getInmobiliariasPublicas(ctx: RouterContext<string>) {
    const { response } = ctx;
    try {
        const lista = await listarInmobiliariasPublicas();
        response.status = 200;
        response.body = {
            ok: true,
            data: lista,
        };
    } catch (error) {
        console.error("[getInmobiliariasPublicas] Error:", error);
        response.status = 500;
        response.body = {
            ok: false,
            message: "Error interno al listar inmobiliarias.",
        };
    }
}

// GET /api/inmobiliarias/:id
// Perfil publico de una inmobiliaria: datos de contacto + sus servicios activos.
// No requiere sesion: cualquier visitante puede ver a quien le esta solicitando un servicio.
export async function getInmobiliariaPublica(ctx: RouterContext<string>) {
    const { response, params } = ctx;

    try {
        const id = Number(params.id);

        if (!id || Number.isNaN(id)) {
            response.status = 400;
            response.body = {
                ok: false,
                message: "El ID de la inmobiliaria no es valido.",
            };
            return;
        }

        const inmobiliaria = await obtenerInmobiliariaPublicaPorId(id);

        if (!inmobiliaria) {
            response.status = 404;
            response.body = {
                ok: false,
                message: "Inmobiliaria no encontrada.",
            };
            return;
        }

        const servicios = await obtenerServiciosActivosDeInmobiliaria(id);

        response.status = 200;
        response.body = {
            ok: true,
            data: { ...inmobiliaria, servicios },
        };
    } catch (error) {
        console.error("[getInmobiliariaPublica] Error:", error);
        response.status = 500;
        response.body = {
            ok: false,
            message: "Error interno al obtener la inmobiliaria.",
        };
    }
}

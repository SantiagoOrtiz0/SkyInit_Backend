import { Context } from "../Dependencies/dependencias.ts";
import { obtenerTerminos } from "../Model/terminosModel.ts";
import { aceptarTerminos } from "../Model/usuarioModel.ts";
import { usuarioAceptoTerminos } from "../Model/terminosModel.ts";

// ---OBTENER TERMINOS---
export function getTerminos(ctx: Context) {
    try {
        const terminos = obtenerTerminos();
        ctx.response.status = 200;
        ctx.response.body = {terminos};
    } catch (error) {
        console.error("Error al obtener terminos:", error);
        ctx.response.status = 500;
        ctx.response.body = {error: "Error interno del servidor"};
    }
}

// ---ACEPTAR TERMINOS---
export async function postAceptarTerminos(ctx: Context) {
    try {
        const userState = ctx.state.user as {sub?: string};
        const usuarioId = Number(userState?.sub);

        if (!usuarioId) {
            ctx.response.status = 401;
            ctx.response.body = {error: "No autorizado"};
            return;
        }

        //VERIFICAR SI YA ESTAN ACEPTADOS
        const yaAcepto = await usuarioAceptoTerminos(usuarioId);
        if(yaAcepto) {
            ctx.response.status = 200;
            ctx.response.body = {mensaje: "ya habias aceptado los terminos anteriormente"};
            return;
        }

        await aceptarTerminos(usuarioId);
        ctx.response.status = 200;
        ctx.response.body = {mensaje: "Terminos aceptados correctamente"};
    } catch (error) {
        console.error("Error al aceptar terminos:", error);
        ctx.response.status = 500;
        ctx.response.body = {error: "Error interno del servidor"};
    }
}

// ---VERIFICAR SI YA ACEPTO (usado en el flujo de registro)---
export async function getEstadoTerminos(ctx: Context) {
    try {
        const userState = ctx.state.user as {sub?: string};
        const usuarioId = Number(userState?.sub);

        if(!usuarioId) {
            ctx.response.status = 401;
            ctx.response.body = {error: "No autorizado"};
            return;
        }

        const acepto = await usuarioAceptoTerminos(usuarioId);
        ctx.response.status = 200;
        ctx.response.body = {aceptoTerminos: acepto}; 
    } catch (error) {
        console.error("Error al verificar terminos:", error);
        ctx.response.status = 500;
        ctx.response.body = {error: "Error interno del servidor"};   
    }
}
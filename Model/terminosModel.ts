import { db } from "./conexion.ts";
import { usuarios } from "./schema.ts";
import { eq } from "../Dependencies/dependencias.ts";

export interface TerminosVigentes {
    version: string;
    fechaActualizacion: string;
    contenido: string;
}

const TERMINOS: TerminosVigentes = {
    version: "1.1",
    fechaActualizacion: "19/09/2026",
    contenido: `
    TÉRMINOS Y CONDICIONES DE USO — SKYINIT

    1. ACEPTACIÓN
    Al registrarse en SkyInit, el usuario acepta los presentes términos y condiciones.

    2. USO DE LA PLATAFORMA
    La plataforma está diseñada para facilitar la búsqueda de vivienda y 
    la solicitud de servicios de mantenimiento en Duitama, Colombia.

    3. DATOS PERSONALES
    SkyInit trata los datos conforme a la Ley 1581 de 2012 (Protección 
    de Datos Personales de Colombia). El usuario puede ejercer sus derechos 
    de acceso, rectificación y eliminación contactando a skyinit2026@gmail.com.

    4. RESPONSABILIDADES
    SkyInit actúa como intermediario. La información de las propiedades 
    es responsabilidad de las constructoras y agentes registrados.

    5. MODIFICACIONES
    SkyInit se reserva el derecho de actualizar estos términos con al 
    menos 48 horas de anticipación a los usuarios registrados.
    `.trim(),
};

/**Retornar los terminos vigentes */
export function obtenerTerminos(): TerminosVigentes {
    return TERMINOS;
}

/**Verificar si un usuario ya acepto los terminos */
export async function usuarioAceptoTerminos(usuarioId: number): Promise<boolean> {
    const resultado = await db
        .select({aceptoTerminos: usuarios.aceptoTerminos})
        .from(usuarios)
        .where(eq(usuarios.usuarioID, usuarioId))
        .limit(1);

    return resultado[0]?.aceptoTerminos === 1;
}
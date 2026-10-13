import { enviarCorreo } from "../Helpers/correo.ts";
import { plantillaRecuperarPassword,plantillaBienvenida } from "../Helpers/plantillacorreos.ts";

/**
 * Envía el correo de recuperación de contraseña (SkyInit).
 * Usa Helpers/correo.ts + plantilla de plantillacorreos.ts
 */
export async function enviarCorreoRecuperarPassword(
  destinatario: string,
  nombre: string,
  codigo: string,
): Promise<void> {
  const html = plantillaRecuperarPassword(nombre, codigo);

  await enviarCorreo({
    destinatario,
    asunto: "Recuperación de contraseña — SkyInit",
    mensaje: `Hola ${nombre}, usa este enlace o código para restablecer tu contraseña: ${codigo}`,
    codigo,
    html,
  });
}

/**
 * (Opcional) Bienvenida — si ya tienes plantillaBienvenida en plantillacorreos
 */
// import { plantillaBienvenida } from "../Helpers/plantillacorreos.ts";
//
export async function enviarCorreoBienvenida(
    destinatario: string,
    nombre: string,
    ): Promise<void> {
    await enviarCorreo({
        destinatario,
        asunto: "¡Bienvenido a SkyInit!",
        mensaje: `Hola ${nombre}, bienvenido a SkyInit Inmobiliaria.`,
        html: plantillaBienvenida(nombre),
    });
}

import { plantillaEstadoSolicitud } from "../Helpers/plantillacorreos.ts";

export async function enviarCorreoEstadoSolicitud(
  destinatario: string,
  nombre: string,
  servicio: string,
  estado: string,
  solicitudId: number,
): Promise<void> {
  await enviarCorreo({
    destinatario,
    asunto: `Tu solicitud de ${servicio} está ${estado} — SkyInit`,
    mensaje:
      `Hola ${nombre}, tu solicitud #${solicitudId} del servicio ${servicio} cambió a: ${estado}.`,
    html: plantillaEstadoSolicitud(nombre, servicio, estado, solicitudId),
  });
}
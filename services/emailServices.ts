import { enviarCorreo } from "../Helpers/correo.ts";
import { plantillaRecuperarPassword,plantillaBienvenida, plantillaAvance } from "../Helpers/plantillacorreos.ts";
import { eq, and, inArray } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import {
  usuarios,
  roles,
  constructorasInmobiliarias,
  proyectos,
  constructoras,
} from "../Model/schema.ts";

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
    asunto: "Tu código de verificación — SkyInit",
    mensaje: `Hola ${nombre}, tu código es: ${codigo}. Válido 15 minutos.`,
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
    asunto: `Actualización de tu solicitud #${solicitudId} — SkyInit`,
    mensaje:
      `Hola ${nombre}, el estado de tu solicitud #${solicitudId} del servicio ${servicio} ahora es: ${estado}.`,
    html: plantillaEstadoSolicitud(nombre, servicio, estado, solicitudId),
  });
}


export async function notificarAdminsAvance(opts: {
  constructoraID: number;
  proyectoID: number;
  porcentaje: number;
  nota?: string | null;
}) {
  const { constructoraID, proyectoID, porcentaje, nota } = opts;

  const [proy] = await db
    .select({ nombre: proyectos.nombre })
    .from(proyectos)
    .where(eq(proyectos.proyectoID, proyectoID))
    .limit(1);

  const [cons] = await db
    .select({ nombre: constructoras.nombre })
    .from(constructoras)
    .where(eq(constructoras.constructoraID, constructoraID))
    .limit(1);

  const nombreProyecto = proy?.nombre ?? `Proyecto #${proyectoID}`;
  const nombreConstructora = cons?.nombre ?? `Constructora #${constructoraID}`;

  const inmos = await db
    .select({ inmobiliariaID: constructorasInmobiliarias.inmobiliariaID })
    .from(constructorasInmobiliarias)
    .where(eq(constructorasInmobiliarias.constructoraID, constructoraID));

  const inmoIDs = inmos.map((i) => i.inmobiliariaID);
  if (!inmoIDs.length) return;

  const admins = await db
    .select({
      correo: usuarios.correo,
      nombre: usuarios.nombre,
    })
    .from(usuarios)
    .innerJoin(roles, eq(usuarios.rolID, roles.rolID))
    .where(
      and(
        inArray(usuarios.inmobiliariaID, inmoIDs),
        eq(roles.nombreRol, "Administrador"),
        eq(usuarios.estadoCuenta, "Activa"),
      ),
    );

  if (!admins.length) return;

  const asunto = `${nombreConstructora}: avance ${porcentaje}% · ${nombreProyecto}`;
  const mensaje =
    `${nombreConstructora} registró un avance del ${porcentaje}% ` +
    `en el proyecto "${nombreProyecto}".` +
    (nota ? `\nNota: ${nota}` : "");

  for (const admin of admins) {
    if (!admin.correo) continue;
    try {
      await enviarCorreo({
        destinatario: admin.correo,
        asunto,
        mensaje,
        html: plantillaAvance(
          admin.nombre ?? "",
          nombreProyecto,
          nombreConstructora,
          porcentaje,
          nota,
        ),
      });
      console.log("Correo de avance enviado a", admin.correo);
    } catch (e) {
      console.error("Error enviando correo a", admin.correo, e);
    }
  }
}
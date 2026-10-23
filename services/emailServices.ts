import { enviarCorreo } from "../Helpers/correo.ts";
import { plantillaRecuperarPassword,plantillaBienvenida } from "../Helpers/plantillacorreos.ts";
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


export function plantillaAvance(
  nombreAdmin: string,
  nombreProyecto: string,
  nombreConstructora: string,
  porcentaje: number,
  nota?: string | null,
): string {
  const notaSegura = nota
    ? String(nota).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : "";

  const bloqueNota = notaSegura
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr><td style="padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;"><p style="margin:0 0 4px;font-size:11px;color:#6b7280;">NOTA</p><p style="margin:0;font-size:14px;color:#1b3a2a;">${notaSegura}</p></td></tr></table>`
    : "";

  return [
    '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"></head>',
    '<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">',
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">',
    '<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">',
    '<tr><td style="background:#1b5e20;padding:24px 28px;">',
    '<p style="margin:0 0 4px;font-size:11px;color:#c8e6c9;letter-spacing:1px;">SKYINIT</p>',
    '<h1 style="margin:0;font-size:20px;color:#ffffff;">Nuevo avance de obra</h1>',
    "</td></tr>",
    '<tr><td style="padding:24px 28px;">',
    `<p style="margin:0 0 12px;font-size:15px;color:#374151;">Hola <strong>${nombreAdmin || "Administrador"}</strong>,</p>`,
    `<p style="margin:0 0 20px;font-size:15px;color:#4b5563;">La constructora <strong style="color:#1b5e20;">${nombreConstructora}</strong> registr&oacute; un avance en un proyecto de tu inmobiliaria.</p>`,
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>',
    `<td width="48%" style="padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;"><p style="margin:0 0 4px;font-size:11px;color:#166534;">PROYECTO</p><p style="margin:0;font-size:15px;font-weight:bold;color:#1b3a2a;">${nombreProyecto}</p></td>`,
    '<td width="4%"></td>',
    `<td width="48%" style="padding:12px 14px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;"><p style="margin:0 0 4px;font-size:11px;color:#166534;">AVANCE</p><p style="margin:0;font-size:22px;font-weight:bold;color:#15803d;">${porcentaje}%</p></td>`,
    "</tr></table>",
    `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr><td style="padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;"><p style="margin:0 0 4px;font-size:11px;color:#64748b;">CONSTRUCTORA</p><p style="margin:0;font-size:15px;font-weight:bold;color:#1b3a2a;">${nombreConstructora}</p></td></tr></table>`,
    bloqueNota,
    "</td></tr>",
    '<tr><td style="padding:14px 28px 20px;border-top:1px solid #f3f4f6;"><p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">SkyInit Inmobiliaria</p></td></tr>',
    "</table></td></tr></table></body></html>",
  ].join("");
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
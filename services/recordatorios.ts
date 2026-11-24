import { and, eq, gt, inArray, lte } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import { agendas, propiedades, usuarios } from "../Model/schema.ts";
import { notificar } from "./notificaciones.ts";
import { enviarCorreo } from "../Helpers/correo.ts";

/**
 * Recordatorios de citas: cada 5 minutos busca visitas (pendientes o confirmadas) que
 * ocurren dentro de las proximas HORAS_ANTES horas y avisa al agente y al cliente.
 *  - Siempre: notificacion dentro de la aplicacion.
 *  - Correo:  solo si RECORDATORIOS_EMAIL=true en el .env (apagado por defecto en local).
 */
const HORAS_ANTES = Number(Deno.env.get("RECORDATORIO_HORAS") ?? 24);
const CON_CORREO = Deno.env.get("RECORDATORIOS_EMAIL") === "true";
const fmt = (f: Date) => f.toLocaleString("es-CO", { dateStyle: "full", timeStyle: "short", timeZone: "America/Bogota" });

export async function enviarRecordatorios(): Promise<number> {
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + HORAS_ANTES * 3600 * 1000);
  const citas = await db.select({
    agendaID: agendas.agendaID, fechaVisita: agendas.fechaVisita, usuarioID: agendas.usuarioID,
    agenteCita: agendas.agenteID, clienteNombre: agendas.clienteNombre,
    propiedad: propiedades.titulo, direccion: propiedades.direccion, agentePropiedad: propiedades.agenteID,
  }).from(agendas).innerJoin(propiedades, eq(agendas.propiedadID, propiedades.propiedadID)).where(and(
    inArray(agendas.estadoAgendaID, [1, 2]), eq(agendas.recordatorioEnviado, 0),
    gt(agendas.fechaVisita, ahora), lte(agendas.fechaVisita, limite),
  ));

  for (const c of citas) {
    // Se marca primero para no repetir el aviso si algo falla a mitad de camino
    await db.update(agendas).set({ recordatorioEnviado: 1 }).where(eq(agendas.agendaID, c.agendaID));
    const agente = c.agenteCita ?? c.agentePropiedad;
    const cuando = fmt(c.fechaVisita);
    await notificar([agente], {
      titulo: "Cita proxima",
      mensaje: `Tienes una visita a "${c.propiedad}" el ${cuando}${c.clienteNombre ? ` con ${c.clienteNombre}` : ""}.`,
      tipo: "agenda", entidadID: c.agendaID, entidadTipo: "agenda",
    });
    await notificar([c.usuarioID], {
      titulo: "Recordatorio de tu visita",
      mensaje: `Tu visita a "${c.propiedad}" (${c.direccion}) es el ${cuando}.`,
      tipo: "agenda", entidadID: c.agendaID, entidadTipo: "agenda",
    });
    if (CON_CORREO) {
      const ids = [agente, c.usuarioID].filter((x): x is number => typeof x === "number");
      const destinatarios = ids.length
        ? await db.select({ correo: usuarios.correo, nombre: usuarios.nombre }).from(usuarios).where(inArray(usuarios.usuarioID, ids))
        : [];
      for (const d of destinatarios) {
        try {
          await enviarCorreo({
            destinatario: d.correo, asunto: "Recordatorio de visita - SkyInit",
            mensaje: `Hola ${d.nombre}, te recordamos la visita a "${c.propiedad}" (${c.direccion}) el ${cuando}.`,
          });
        } catch (e) {
          console.error("No se pudo enviar el correo de recordatorio:", e);
        }
      }
    }
  }
  return citas.length;
}

export function iniciarRecordatorios(): void {
  const ejecutar = () => enviarRecordatorios().catch((e) => console.error("Error en recordatorios:", e));
  setTimeout(ejecutar, 10_000);
  setInterval(ejecutar, 5 * 60 * 1000);
}

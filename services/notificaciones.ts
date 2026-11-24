import { db } from "../Model/conexion.ts";
import { notificaciones } from "../Model/schema.ts";

export interface DatosNotificacion {
  titulo: string;
  mensaje: string;
  tipo: string; // agenda | tarea | seguimiento | sistema
  entidadID?: number | null;
  entidadTipo?: string | null;
}

/** Crea una notificacion para cada usuario. Nunca interrumpe la operacion principal si falla. */
export async function notificar(usuarioIDs: Array<number | null | undefined>, datos: DatosNotificacion): Promise<void> {
  const ids = [...new Set(usuarioIDs.filter((id): id is number => typeof id === "number" && id > 0))];
  if (ids.length === 0) return;
  try {
    await db.insert(notificaciones).values(ids.map((usuarioID) => ({
      usuarioID,
      titulo: datos.titulo.slice(0, 150),
      mensaje: datos.mensaje,
      tipoNotificacion: datos.tipo,
      entidadID: datos.entidadID ?? null,
      entidadTipo: datos.entidadTipo ?? null,
    })));
  } catch (e) {
    console.error("No se pudo crear la notificacion:", e);
  }
}

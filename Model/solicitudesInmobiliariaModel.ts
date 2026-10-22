import { and, desc, eq, sql } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import {
  estadosreparacion,
  serviciosmantenimiento,
  serviciossolicitados,
  usuarios,
} from "../Model/schema.ts";

export const ESTADOS_SOLICITUD = [
  "aun no aceptada",
  "aceptada",
  "en proceso",
  "finalizado",
] as const;

export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];

export interface SolicitudInmobiliariaItem {
  SolicitudID: number;
  Usuario: string;
  Servicio: string;
  Estado: string | null;
  Fecha: Date | string;
  FechaFinalizacion: Date | string | null;
  Notas: string | null;
}

export interface SolicitudEstadoActualizada extends SolicitudInmobiliariaItem {
  Correo: string;
}

export interface ListarSolicitudesFiltros {
  inmobiliariaId: number;
  estado?: string;
  servicioId?: number;
  page?: number;
  limit?: number;
}

export interface ListarSolicitudesResultado {
  items: SolicitudInmobiliariaItem[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_DEFAULT = 1;
const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 100;

export async function listarSolicitudes(
  f: ListarSolicitudesFiltros,
): Promise<ListarSolicitudesResultado> {
  const page =
    Number.isInteger(f.page) && (f.page as number) > 0
      ? (f.page as number)
      : PAGE_DEFAULT;
  const limit =
    Number.isInteger(f.limit) && (f.limit as number) > 0
      ? Math.min(f.limit as number, LIMIT_MAX)
      : LIMIT_DEFAULT;
  const offset = (page - 1) * limit;

  const conds = [eq(serviciossolicitados.inmobiliariaID, f.inmobiliariaId)];
  if (f.estado) {
    conds.push(eq(estadosreparacion.descripcion, f.estado));
  }
  if (f.servicioId !== undefined) {
    conds.push(eq(serviciossolicitados.servicioID, f.servicioId));
  }
  const whereExpr = and(...conds);

  const items = await db
    .select({
      SolicitudID: serviciossolicitados.solicitudID,
      Usuario: usuarios.nombre,
      Servicio: serviciosmantenimiento.nombre,
      Estado: estadosreparacion.descripcion,
      Fecha: serviciossolicitados.fechaSolicitud,
      FechaFinalizacion: serviciossolicitados.fechaFinalizacion,
      Notas: serviciossolicitados.notas,
    })
    .from(serviciossolicitados)
    .innerJoin(usuarios, eq(usuarios.usuarioID, serviciossolicitados.usuarioID))
    .innerJoin(
      serviciosmantenimiento,
      eq(serviciosmantenimiento.servicioID, serviciossolicitados.servicioID),
    )
    .leftJoin(
      estadosreparacion,
      eq(
        estadosreparacion.estadoReparacionID,
        serviciossolicitados.estadoReparacionID,
      ),
    )
    .where(whereExpr)
    .orderBy(desc(serviciossolicitados.fechaSolicitud))
    .limit(limit)
    .offset(offset);

  const totalFilas = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(serviciossolicitados)
    .innerJoin(usuarios, eq(usuarios.usuarioID, serviciossolicitados.usuarioID))
    .innerJoin(
      serviciosmantenimiento,
      eq(serviciosmantenimiento.servicioID, serviciossolicitados.servicioID),
    )
    .leftJoin(
      estadosreparacion,
      eq(
        estadosreparacion.estadoReparacionID,
        serviciossolicitados.estadoReparacionID,
      ),
    )
    .where(whereExpr);

  return {
    items: items as SolicitudInmobiliariaItem[],
    total: Number(totalFilas[0]?.total ?? 0),
    page,
    limit,
  };
}

export async function actualizarEstadoSolicitud(
  inmobiliariaId: number,
  solicitudId: number,
  estadoTexto: EstadoSolicitud,
  notas?: string | null,
): Promise<SolicitudEstadoActualizada | null> {
  const estados = await db
    .select({
      estadoReparacionID: estadosreparacion.estadoReparacionID,
      descripcion: estadosreparacion.descripcion,
    })
    .from(estadosreparacion)
    .where(eq(estadosreparacion.descripcion, estadoTexto))
    .limit(1);

  const estado = estados[0];
  if (!estado) return null;

  const filas = await db
    .select({
      SolicitudID: serviciossolicitados.solicitudID,
      Usuario: usuarios.nombre,
      Correo: usuarios.correo,
      Servicio: serviciosmantenimiento.nombre,
      Fecha: serviciossolicitados.fechaSolicitud,
      Notas: serviciossolicitados.notas,
    })
    .from(serviciossolicitados)
    .innerJoin(usuarios, eq(usuarios.usuarioID, serviciossolicitados.usuarioID))
    .innerJoin(
      serviciosmantenimiento,
      eq(serviciosmantenimiento.servicioID, serviciossolicitados.servicioID),
    )
    .where(
      and(
        eq(serviciossolicitados.solicitudID, solicitudId),
        eq(serviciossolicitados.inmobiliariaID, inmobiliariaId),
      ),
    )
    .limit(1);

  const actual = filas[0];
  if (!actual) return null;

  const esFinalizado = estadoTexto === "finalizado";
  const setData: {
    estadoReparacionID: number;
    notas?: string | null;
    fechaFinalizacion?: Date | null;
  } = {
    estadoReparacionID: estado.estadoReparacionID,
  };

  if (notas !== undefined) {
    setData.notas = notas;
  }
  if (esFinalizado) {
    setData.fechaFinalizacion = new Date();
  } else {
    setData.fechaFinalizacion = null;
  }

  await db
    .update(serviciossolicitados)
    .set(setData)
    .where(
      and(
        eq(serviciossolicitados.solicitudID, solicitudId),
        eq(serviciossolicitados.inmobiliariaID, inmobiliariaId),
      ),
    );

  return {
    SolicitudID: actual.SolicitudID,
    Usuario: actual.Usuario,
    Correo: actual.Correo,
    Servicio: actual.Servicio,
    Estado: estado.descripcion,
    Fecha: actual.Fecha,
    FechaFinalizacion: esFinalizado
      ? (setData.fechaFinalizacion ?? null)
      : null,
    Notas: notas !== undefined ? notas : actual.Notas,
  };
}

export async function eliminarSolicitud(
  inmobiliariaId: number,
  solicitudId: number,
): Promise<boolean> {
  const result = await db
    .delete(serviciossolicitados)
    .where(
      and(
        eq(serviciossolicitados.solicitudID, solicitudId),
        eq(serviciossolicitados.inmobiliariaID, inmobiliariaId),
      ),
    );

  // Drizzle MySQL: rowsAffected según driver
  const affected = (result as { rowsAffected?: number })?.rowsAffected ?? 0;
  return affected > 0;
}

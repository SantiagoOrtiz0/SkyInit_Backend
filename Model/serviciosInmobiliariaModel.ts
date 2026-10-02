import { and, asc, eq, like, ne, sql } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import { serviciosmantenimiento, serviciossolicitados } from "../Model/schema.ts";

export interface ServicioInmobiliaria {
  ServicioID: number;
  InmobiliariaID: number | null;
  Nombre: string;
  Descripcion: string;
  Precio: string;
  Estado: string;
  Imagen: string | null;
}

const columnasSelect = {
  ServicioID: serviciosmantenimiento.servicioID,
  InmobiliariaID: serviciosmantenimiento.inmobiliariaID,
  Nombre: serviciosmantenimiento.nombre,
  Descripcion: serviciosmantenimiento.descripcion,
  Precio: serviciosmantenimiento.precio,
  Estado: serviciosmantenimiento.estado,
  Imagen: serviciosmantenimiento.imagen,
} as const;

export interface ListarFiltros {
  inmobiliariaId: number;
  estado?: string;
  q?: string;
}

export async function listarServicios(f: ListarFiltros): Promise<ServicioInmobiliaria[]> {
  const conds = [eq(serviciosmantenimiento.inmobiliariaID, f.inmobiliariaId)];

  if (f.estado) conds.push(eq(serviciosmantenimiento.estado, f.estado));
  if (f.q && f.q.trim().length > 0) {
    conds.push(like(serviciosmantenimiento.nombre, `%${f.q.trim()}%`));
  }

  const filas = await db
    .select(columnasSelect)
    .from(serviciosmantenimiento)
    .where(and(...conds))
    .orderBy(asc(serviciosmantenimiento.nombre));

  return filas as ServicioInmobiliaria[];
}

export async function obtenerServicio(
  servicioId: number,
  inmobiliariaId: number,
): Promise<ServicioInmobiliaria | null> {
  const filas = await db
    .select(columnasSelect)
    .from(serviciosmantenimiento)
    .where(
      and(
        eq(serviciosmantenimiento.servicioID, servicioId),
        eq(serviciosmantenimiento.inmobiliariaID, inmobiliariaId),
      ),
    )
    .limit(1);

  return (filas[0] as ServicioInmobiliaria | undefined) ?? null;
}

export async function existeNombreEnInmobiliaria(
  nombre: string,
  inmobiliariaId: number,
  excluirServicioId?: number,
): Promise<boolean> {
  const conds = [
    eq(serviciosmantenimiento.inmobiliariaID, inmobiliariaId),
    eq(serviciosmantenimiento.nombre, nombre),
  ];
  if (excluirServicioId !== undefined) {
    conds.push(ne(serviciosmantenimiento.servicioID, excluirServicioId));
  }

  const filas = await db
    .select({ servicioID: serviciosmantenimiento.servicioID })
    .from(serviciosmantenimiento)
    .where(and(...conds))
    .limit(1);

  return filas.length > 0;
}

export interface CrearServicioInput {
  InmobiliariaID: number;
  Nombre: string;
  Descripcion: string;
  Precio: string;
  Estado: string;
  Imagen: string | null;
}

export async function crearServicio(input: CrearServicioInput): Promise<number> {
  const res = await db.insert(serviciosmantenimiento).values({
    inmobiliariaID: input.InmobiliariaID,
    nombre: input.Nombre,
    descripcion: input.Descripcion,
    precio: input.Precio,
    estado: input.Estado,
    imagen: input.Imagen,
  });
  const insertId = (res as unknown as Array<{ insertId: number }>)[0]?.insertId;
  if (!insertId) throw new Error("No se pudo obtener el ID insertado");
  return insertId;
}

export interface ActualizarServicioInput {
  Nombre: string;
  Descripcion: string;
  Precio: string;
  Estado: string;
  Imagen: string | null;
}

export async function actualizarServicio(
  servicioId: number,
  inmobiliariaId: number,
  datos: ActualizarServicioInput,
): Promise<void> {
  await db
    .update(serviciosmantenimiento)
    .set({
      nombre: datos.Nombre,
      descripcion: datos.Descripcion,
      precio: datos.Precio,
      estado: datos.Estado,
      imagen: datos.Imagen,
    })
    .where(
      and(
        eq(serviciosmantenimiento.servicioID, servicioId),
        eq(serviciosmantenimiento.inmobiliariaID, inmobiliariaId),
      ),
    );
}

export async function cambiarEstadoServicio(
  servicioId: number,
  inmobiliariaId: number,
  estado: "Activo" | "Inactivo",
): Promise<void> {
  await db
    .update(serviciosmantenimiento)
    .set({ estado })
    .where(
      and(
        eq(serviciosmantenimiento.servicioID, servicioId),
        eq(serviciosmantenimiento.inmobiliariaID, inmobiliariaId),
      ),
    );
}

export async function contarSolicitudesDeServicio(servicioId: number): Promise<number> {
  const filas = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(serviciossolicitados)
    .where(eq(serviciossolicitados.servicioID, servicioId));

  return Number((filas[0] as { total?: number } | undefined)?.total ?? 0);
}

export async function eliminarServicio(
  servicioId: number,
  inmobiliariaId: number,
): Promise<void> {
  await db
    .delete(serviciosmantenimiento)
    .where(
      and(
        eq(serviciosmantenimiento.servicioID, servicioId),
        eq(serviciosmantenimiento.inmobiliariaID, inmobiliariaId),
      ),
    );
}
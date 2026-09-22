import { db } from "./conexion.ts";
import { serviciosmantenimiento } from "./schema.ts";
import { eq } from "../Dependencies/dependencias.ts";

// Tipo de retorno para un servicio activo
export interface ServicioMantenimiento {
    servicioID: number;
    nombre: string;
    descripcion: string;
    precio: string;
    estado: string;
    imagen: string | null;
}


export async function obtenerServiciosActivos(): Promise<ServicioMantenimiento[]> {
    const rows = await db
        .select({
            servicioID: serviciosmantenimiento.servicioID,
            nombre:     serviciosmantenimiento.nombre,
            descripcion: serviciosmantenimiento.descripcion,
            precio:     serviciosmantenimiento.precio,
            estado:     serviciosmantenimiento.estado,
            imagen:     serviciosmantenimiento.imagen,
        })
        .from(serviciosmantenimiento)
        .where(eq(serviciosmantenimiento.estado, "Activo"));

    return rows as ServicioMantenimiento[];
}

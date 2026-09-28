import { db } from "./conexion.ts";
import { inmobiliarias, serviciosmantenimiento } from "./schema.ts";
import { eq, and } from "../Dependencies/dependencias.ts";

// Perfil publico de una inmobiliaria (lo que puede ver cualquier visitante, con o sin sesion)
export interface InmobiliariaPublica {
    inmobiliariaID: number;
    nombre: string;
    logo: string | null;
    descripcion: string | null;
    contacto: string | null;
    telefono: string | null;
    correo: string | null;
    ciudad: string | null;
}

// Servicio de mantenimiento activo, ya sin repetir los datos de la inmobiliaria
export interface ServicioDeInmobiliaria {
    servicioID: number;
    nombre: string;
    descripcion: string;
    precio: string;
    estado: string;
    imagen: string | null;
}

// Trae los datos publicos de una inmobiliaria por su ID (null si no existe)
export async function obtenerInmobiliariaPublicaPorId(
    inmobiliariaID: number,
): Promise<InmobiliariaPublica | null> {
    const rows = await db
        .select({
            inmobiliariaID: inmobiliarias.inmobiliariaID,
            nombre: inmobiliarias.nombre,
            logo: inmobiliarias.logo,
            descripcion: inmobiliarias.descripcion,
            contacto: inmobiliarias.contacto,
            telefono: inmobiliarias.telefono,
            correo: inmobiliarias.correo,
            ciudad: inmobiliarias.ciudad,
        })
        .from(inmobiliarias)
        .where(eq(inmobiliarias.inmobiliariaID, inmobiliariaID))
        .limit(1);

    return (rows[0] as InmobiliariaPublica) ?? null;
}

// Servicios de mantenimiento activos publicados por esa inmobiliaria
export async function obtenerServiciosActivosDeInmobiliaria(
    inmobiliariaID: number,
): Promise<ServicioDeInmobiliaria[]> {
    const rows = await db
        .select({
            servicioID: serviciosmantenimiento.servicioID,
            nombre: serviciosmantenimiento.nombre,
            descripcion: serviciosmantenimiento.descripcion,
            precio: serviciosmantenimiento.precio,
            estado: serviciosmantenimiento.estado,
            imagen: serviciosmantenimiento.imagen,
        })
        .from(serviciosmantenimiento)
        .where(
            and(
                eq(serviciosmantenimiento.inmobiliariaID, inmobiliariaID),
                eq(serviciosmantenimiento.estado, "Activo"),
            ),
        );

    return rows as ServicioDeInmobiliaria[];
}

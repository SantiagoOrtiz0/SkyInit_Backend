import { db } from "./conexion.ts";
import { serviciosmantenimiento, inmobiliarias, serviciossolicitados } from "./schema.ts";
import { eq, and } from "../Dependencies/dependencias.ts";

// Tipo de retorno para un servicio activo, incluyendo la inmobiliaria que lo subio
export interface ServicioMantenimiento {
    servicioID: number;
    inmobiliariaID: number | null;
    inmobiliariaNombre: string | null;
    inmobiliariaLogo: string | null;
    nombre: string;
    descripcion: string;
    precio: string;
    estado: string;
    imagen: string | null;
}

// Un servicio ya sin los datos de la inmobiliaria (van en el grupo, no repetidos por fila)
export type ServicioDeGrupo = Omit<
    ServicioMantenimiento,
    "inmobiliariaID" | "inmobiliariaNombre" | "inmobiliariaLogo"
>;

// Todos los servicios de una misma inmobiliaria, agrupados para la vista publica
export interface GrupoServiciosInmobiliaria {
    inmobiliariaID: number | null;
    inmobiliaria: string;
    inmobiliariaLogo: string | null;
    servicios: ServicioDeGrupo[];
}

const SIN_INMOBILIARIA = "Servicios sin inmobiliaria asignada";

// Trae todos los servicios activos junto con la inmobiliaria que los subio (join, no se filtra por inmobiliaria)
export async function obtenerServiciosActivos(): Promise<ServicioMantenimiento[]> {
    const rows = await db
        .select({
            servicioID: serviciosmantenimiento.servicioID,
            inmobiliariaID: serviciosmantenimiento.inmobiliariaID,
            inmobiliariaNombre: inmobiliarias.nombre,
            inmobiliariaLogo: inmobiliarias.logo,
            nombre:     serviciosmantenimiento.nombre,
            descripcion: serviciosmantenimiento.descripcion,
            precio:     serviciosmantenimiento.precio,
            estado:     serviciosmantenimiento.estado,
            imagen:     serviciosmantenimiento.imagen,
        })
        .from(serviciosmantenimiento)
        .leftJoin(inmobiliarias, eq(serviciosmantenimiento.inmobiliariaID, inmobiliarias.inmobiliariaID))
        .where(eq(serviciosmantenimiento.estado, "Activo"));

    return rows as ServicioMantenimiento[];
}

// Agrupa los servicios activos por la inmobiliaria que los subio (para la vista de catalogo)
export async function obtenerServiciosAgrupadosPorInmobiliaria(): Promise<GrupoServiciosInmobiliaria[]> {
    const servicios = await obtenerServiciosActivos();

    const grupos = new Map<number, GrupoServiciosInmobiliaria>();

    for (const s of servicios) {
        // clave 0 reservada para servicios sin InmobiliariaID asignado
        const clave = s.inmobiliariaID ?? 0;

        if (!grupos.has(clave)) {
            grupos.set(clave, {
                inmobiliariaID: s.inmobiliariaID,
                inmobiliaria: s.inmobiliariaNombre ?? SIN_INMOBILIARIA,
                inmobiliariaLogo: s.inmobiliariaLogo,
                servicios: [],
            });
        }

        grupos.get(clave)!.servicios.push({
            servicioID: s.servicioID,
            nombre: s.nombre,
            descripcion: s.descripcion,
            precio: s.precio,
            estado: s.estado,
            imagen: s.imagen,
        });
    }

    const listaGrupos = Array.from(grupos.values());

    // Orden alfabetico por inmobiliaria; el grupo "sin inmobiliaria" siempre al final
    listaGrupos.sort((a, b) => {
        if (a.inmobiliariaID === null) return 1;
        if (b.inmobiliariaID === null) return -1;
        return a.inmobiliaria.localeCompare(b.inmobiliaria, "es");
    });

    return listaGrupos;
}

// ── Solicitar servicio ──────────────────────────────────────────

// Verifica que el servicio exista y este activo antes de dejar solicitarlo
export async function servicioActivoExiste(servicioID: number): Promise<boolean> {
    const rows = await db
        .select({ servicioID: serviciosmantenimiento.servicioID })
        .from(serviciosmantenimiento)
        .where(
            and(
                eq(serviciosmantenimiento.servicioID, servicioID),
                eq(serviciosmantenimiento.estado, "Activo"),
            ),
        )
        .limit(1);

    return rows.length > 0;
}

export interface NuevaSolicitudServicio {
    servicioID: number;
    usuarioID: number;
    propiedadID?: number | null;
    notas?: string | null;
}

// Crea una solicitud de servicio de mantenimiento y devuelve el ID generado
export async function crearSolicitudServicio(datos: NuevaSolicitudServicio): Promise<number> {
    const resultado = await db.insert(serviciossolicitados).values({
        servicioID: datos.servicioID,
        usuarioID: datos.usuarioID,
        propiedadID: datos.propiedadID ?? null,
        notas: datos.notas ?? null,
        // estadoReparacionID queda null: aun no hay un tecnico/estado asignado a la solicitud
    });

    return Number(resultado[0].insertId);
}

import { sql } from "../Dependencies/dependencias.ts";
import { db } from "./conexion.ts";
import { propiedades, proyectos, constructoras, serviciosmantenimiento } from "./schema.ts";

export async function obtenerResumenAdmin() {
    const [[totalPropiedades], [totalProyectos], [totalConstructoras], [totalServicios]] =
    await Promise.all([
        db.select({ total: sql<number>`count(*)`}).from(propiedades),
        db.select({ total: sql<number>`count(*)`}).from(proyectos),
        db.select({ total: sql<number>`count(*)`}).from(constructoras),
        db.select({ total: sql<number>`count(*)`}).from(serviciosmantenimiento),
    ]);


    // Propiedades por estado
    const propsPorEstado = await db.select({
        estado: propiedades.estado,
        total: sql<number>`count(*)`,
    })
    .from(propiedades)
    .groupBy(propiedades.estado);



    // Proyectos por estado
    const proysPorEstado = await db.select({
        estadoProyectoID: proyectos.estadoProyectoID,
        total: sql<number>`count(*)`,
    })
    .from(proyectos)
    .groupBy(proyectos.estadoProyectoID);

    return {
        totales: {
            propiedades: Number(totalPropiedades.total),
            proyectos: Number(totalProyectos.total),
            constructoras: Number(totalConstructoras.total),
            servicios: Number(totalServicios.total),
        },
        propiedadesPorEstado: propsPorEstado.map((r) => ({
            estado: r.estado,
            total: Number(r.total),
        })),
        proyectosPorEstado: proysPorEstado.map((r) => ({
            estadoProyectoID: r.estadoProyectoID,
            total: Number(r.total),
        })),
    };
}
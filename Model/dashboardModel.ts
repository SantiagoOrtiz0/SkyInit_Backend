import { sql, eq, and } from "../Dependencies/dependencias.ts";
import { db } from "./conexion.ts";
import { propiedades, proyectos, constructoras, serviciosmantenimiento , constructorasInmobiliarias} from "./schema.ts";
import { usuarios, roles, inmobiliarias, } from "./schema.ts";


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

export async function obtenerResumenAgente(
    inmobiliariaID: number,
    agenteID: number,
    ) {
    // Propiedades de la inmobiliaria
    const [totalPropsInmo] = await db
        .select({ total: sql<number>`count(*)` })
        .from(propiedades)
        .where(eq(propiedades.inmobiliariaID, inmobiliariaID));

    // Propiedades asignadas a este agente
    const [totalPropsMias] = await db
        .select({ total: sql<number>`count(*)` })
        .from(propiedades)
        .where(
        and(
            eq(propiedades.inmobiliariaID, inmobiliariaID),
            eq(propiedades.agenteID, agenteID),
        ),
        );

    // Destacadas
    const [totalDestacadas] = await db
        .select({ total: sql<number>`count(*)` })
        .from(propiedades)
        .where(
        and(
            eq(propiedades.inmobiliariaID, inmobiliariaID),
            eq(propiedades.destacada, 1),
        ),
        );

    // Proyectos
    const [totalProyectos] = await db
        .select({ total: sql<number>`count(*)` })
        .from(proyectos)
        .where(eq(proyectos.inmobiliariaID, inmobiliariaID));

    // Constructoras vinculadas
    const [totalConstructoras] = await db
        .select({ total: sql<number>`count(*)` })
        .from(constructorasInmobiliarias)
        .where(eq(constructorasInmobiliarias.inmobiliariaID, inmobiliariaID));

    // Propiedades por estado
    const propsPorEstado = await db
        .select({
        estado: propiedades.estado,
        total: sql<number>`count(*)`,
        })
        .from(propiedades)
        .where(eq(propiedades.inmobiliariaID, inmobiliariaID))
        .groupBy(propiedades.estado);

    // Proyectos por estado
    const proysPorEstado = await db
        .select({
        estadoProyectoID: proyectos.estadoProyectoID,
        total: sql<number>`count(*)`,
        })
        .from(proyectos)
        .where(eq(proyectos.inmobiliariaID, inmobiliariaID))
        .groupBy(proyectos.estadoProyectoID);

    return {
        totales: {
        propiedades: Number(totalPropsInmo?.total ?? 0),
        misPropiedades: Number(totalPropsMias?.total ?? 0),
        destacadas: Number(totalDestacadas?.total ?? 0),
        proyectos: Number(totalProyectos?.total ?? 0),
        constructoras: Number(totalConstructoras?.total ?? 0),
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
export async function obtenerResumenSuperAdmin() {
    const [totalUsuarios] = await db
        .select({ total: sql<number>`count(*)` })
        .from(usuarios);

    const [totalInmobiliarias] = await db
        .select({ total: sql<number>`count(*)` })
        .from(inmobiliarias);

    const [totalConstructoras] = await db
        .select({ total: sql<number>`count(*)` })
        .from(constructoras);

    const [totalPropiedades] = await db
        .select({ total: sql<number>`count(*)` })
        .from(propiedades);

    const [totalProyectos] = await db
        .select({ total: sql<number>`count(*)` })
        .from(proyectos);

    // Usuarios por rol
    const usuariosPorRol = await db
        .select({
        rolID: usuarios.rolID,
        nombreRol: roles.nombreRol,
        total: sql<number>`count(*)`,
        })
        .from(usuarios)
        .innerJoin(roles, eq(usuarios.rolID, roles.rolID))
        .groupBy(usuarios.rolID, roles.nombreRol);

    // Propiedades por estado
    const propsPorEstado = await db
        .select({
        estado: propiedades.estado,
        total: sql<number>`count(*)`,
        })
        .from(propiedades)
        .groupBy(propiedades.estado);

    // Proyectos por estado
    const proysPorEstado = await db
        .select({
        estadoProyectoID: proyectos.estadoProyectoID,
        total: sql<number>`count(*)`,
        })
        .from(proyectos)
        .groupBy(proyectos.estadoProyectoID);

    // Constructoras por estado
    const consPorEstado = await db
        .select({
        estado: constructoras.estado,
        total: sql<number>`count(*)`,
        })
        .from(constructoras)
        .groupBy(constructoras.estado);

    return {
        totales: {
        usuarios: Number(totalUsuarios?.total ?? 0),
        inmobiliarias: Number(totalInmobiliarias?.total ?? 0),
        constructoras: Number(totalConstructoras?.total ?? 0),
        propiedades: Number(totalPropiedades?.total ?? 0),
        proyectos: Number(totalProyectos?.total ?? 0),
        },
        usuariosPorRol: usuariosPorRol.map((r) => ({
        rolID: r.rolID,
        nombreRol: r.nombreRol,
        total: Number(r.total),
        })),
        propiedadesPorEstado: propsPorEstado.map((r) => ({
        estado: r.estado,
        total: Number(r.total),
        })),
        proyectosPorEstado: proysPorEstado.map((r) => ({
        estadoProyectoID: r.estadoProyectoID,
        total: Number(r.total),
        })),
        constructorasPorEstado: consPorEstado.map((r) => ({
        estado: r.estado,
        total: Number(r.total),
        })),
    };
}
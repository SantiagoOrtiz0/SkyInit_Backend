import { eq, and, like, desc, asc } from "../Dependencies/dependencias.ts";
import { db } from "./conexion.ts";
import { proyectos, estadosproyecto, constructoras, imagenesproyecto, avancesproyecto} from "./schema.ts";

interface ProyectoData {
    nombre: string;
    estadoProyectoID: number;
    porcentajeAvance?: string;
    fechaInicio?: Date | null;
    fechaFin?: Date | null;
    constructoraID?: number | null;
    descripcion?: string | null;
    ubicacion?: string | null;
}

interface FiltrosProyecto {
    estadoProyectoID?: number;
    constructoraID?: number;
    ubicacion?: string;
    orden?: "avance_asc" | "avance_desc" | "fecha";
}

export class Proyecto {
    public _ObjProyecto: ProyectoData | null;
    public _idProyecto: number | null;

    constructor(ObjProyecto: ProyectoData | null = null, idProyecto: number | null = null) {
        this._ObjProyecto = ObjProyecto;
        this._idProyecto = idProyecto;
    }


    // Traemos los datos del proyecto con estado, con constructora e imagenes
    public async ConsultarProyecto() {
        const [proyecto] = await db.select({
            proyectoID: proyectos.proyectoID,
            nombre: proyectos.nombre,
            estadoProyectoID: proyectos.estadoProyectoID,
            porcentajeAvance: proyectos.porcentajeAvance,
            fechaInicio: proyectos.fechaInicio,
            fechaFin: proyectos.fechaFin,
            descripcion: proyectos.descripcion,
            ubicacion: proyectos.ubicacion,
            estadoProyecto: estadosproyecto.descripcion,
            constructoraID: constructoras.constructoraID,
            constructoraNombre: constructoras.nombre,
        })
        .from(proyectos)
        .innerJoin(estadosproyecto, eq(proyectos.estadoProyectoID, estadosproyecto.estadoProyectoID))
        .leftJoin(constructoras, eq(proyectos.constructoraID, constructoras.constructoraID))
        .where(eq(proyectos.proyectoID, this._idProyecto!));

        if (!proyecto) return null;

        const imagenes = await db
        .select({ url: imagenesproyecto.url })
        .from(imagenesproyecto)
        .where(eq(imagenesproyecto.proyectoID, this._idProyecto!));

        return {...proyecto, imagenes: imagenes.map((i) => i.url)};
    }

    // Filtrado por estado, constructora, ubicacion y ordenar proyectos

    public async SeleccionarProyectos(filtros: FiltrosProyecto = {}) {
        const condiciones = [];

        if (filtros.estadoProyectoID) condiciones.push(eq(proyectos.estadoProyectoID, filtros.estadoProyectoID));
        if (filtros.constructoraID) condiciones.push(eq(proyectos.constructoraID, filtros.constructoraID));
        if (filtros.ubicacion) condiciones.push(like(proyectos.ubicacion, `%${filtros.ubicacion}%`));

        const query = db.select({
            proyectoID: proyectos.proyectoID,
            nombre: proyectos.nombre,
            estadoProyectoID: proyectos.estadoProyectoID,
            porcentajeAvance: proyectos.porcentajeAvance,
            fechaInicio: proyectos.fechaInicio,
            fechaFin: proyectos.fechaFin,
            ubicacion: proyectos.ubicacion,
            estadoProyecto: estadosproyecto.descripcion,
        })
        .from(proyectos)
        .innerJoin(estadosproyecto, eq(proyectos.estadoProyectoID, estadosproyecto.estadoProyectoID))
        .where(condiciones.length ? and(...condiciones) : undefined);

        switch (filtros.orden) {
            case "avance_asc" :
                return await query.orderBy(asc(proyectos.porcentajeAvance));
            case "avance_desc":
                return await query.orderBy(desc(proyectos.porcentajeAvance));
            case "fecha":
                return await query.orderBy(desc(proyectos.fechaInicio));
            default:
                return await query;
        }
    }
    // Proyectos similares (misma constructora y mismo estado)
    public async SeleccionarSimilares(constructoraID: number, estadoProyectoID: number) {
        return await db
        .select()
        .from(proyectos)
        .where(
            and(
                eq(proyectos.constructoraID, constructoraID),
                eq(proyectos.estadoProyectoID, estadoProyectoID),
            ),
        )
        .limit(6);
    }
    // Proyectos de la constructora
    public async SeleccionarPorConstructora(constructoraID: number) {
        return await db.select().from(proyectos).where(eq(proyectos.constructoraID, constructoraID));
    }

    // Historial de avances del proyecto (porcentaje y notas)
    public async SeleccionarAvances() {
        return await db
        .select()
        .from(avancesproyecto)
        .where(eq(avancesproyecto.proyectoID, this._idProyecto!))
        .orderBy(desc(avancesproyecto.fechaRegistro));
    }

    // Registrar un nuevo avance del proyecto (constructora)
    public async RegistrarAvance(usuarioID: number, porcentaje: string, nota?: string | null) {
        const [resultado] = await db.insert(avancesproyecto).values({
            proyectoID: this._idProyecto!,
            usuarioID: usuarioID,
            porcentaje: porcentaje,
            nota: nota ?? null,
        });
        return (resultado as any).affectedRows ?? 0;
    }

    // Registrar un nuevo proyecto (constructora, administrador)
    public async InsertarProyecto(): Promise<number> {
        const proyecto = this._ObjProyecto!;
        const [resultado] = await db.insert(proyectos).values({
            nombre: proyecto.nombre,
            estadoProyectoID: proyecto.estadoProyectoID,
            porcentajeAvance: proyecto.porcentajeAvance ?? "0.00",
            fechaInicio: proyecto.fechaInicio,
            fechaFin: proyecto.fechaFin,
            constructoraID: proyecto.constructoraID,
            descripcion: proyecto.descripcion,
            ubicacion: proyecto.ubicacion,
        });
        return (resultado as any).affectedRows ?? 0;
    }

    // Editar proyectos
    public async ActualizarProyecto(): Promise<number> {
        const proyecto = this._ObjProyecto!;
        const [resultado] = await db
        .update(proyectos)
        .set({
            nombre: proyecto.nombre,
            estadoProyectoID: proyecto.estadoProyectoID,
            porcentajeAvance: proyecto.porcentajeAvance,
            fechaInicio: proyecto.fechaInicio,
            fechaFin: proyecto.fechaFin,
            constructoraID: proyecto.constructoraID,
            descripcion: proyecto.descripcion,
            ubicacion: proyecto.ubicacion,
        })
        .where(eq(proyectos.proyectoID, this._idProyecto!));
        return (resultado as any).affectedRows ?? 0;
    }

    // Eliminar proyectos 
    public async EliminarProyecto(): Promise<number> {
        const [resultado] = await db
        .delete(proyectos)
        .where(eq(proyectos.proyectoID, this._idProyecto!));
        return (resultado as any).affectedRows ?? 0; 
    }
}
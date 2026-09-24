import { eq, and, like, desc, asc } from "../Dependencies/dependencias.ts";
import { db } from "./conexion.ts";
import { proyectos, estadosproyecto, constructoras, imagenesproyecto, avancesproyecto, usuarios} from "./schema.ts";

interface ProyectoData {
    nombre?: string;
    estadoProyectoID?: number;
    porcentajeAvance?: string;
    fechaInicio?:string| Date | null;
    fechaFin?: string| Date | null;
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
        public async RegistrarAvance(
        usuarioID: number,
        porcentaje: number | string,
        nota?: string | null,
    ) {
        const pct = String(porcentaje);

        const [resultado] = await db.insert(avancesproyecto).values({
            proyectoID: this._idProyecto!,
            usuarioID,
            porcentaje: pct,
            nota: nota ?? null,
        });

        // Actualiza el % actual del proyecto (importante)
        await db
            .update(proyectos)
            .set({ porcentajeAvance: pct })
            .where(eq(proyectos.proyectoID, this._idProyecto!));

        (resultado as { affectedRows?: number }).affectedRows
    }

    public async InsertarProyecto(): Promise<number> {
        const proyecto = this._ObjProyecto!;

        const toDate = (v: string | Date | null | undefined): Date | null => {
        if (v == null || v === "") return null;
        if (v instanceof Date) return v;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;};

        const [resultado] = await db.insert(proyectos).values({
            nombre: proyecto.nombre!,
            estadoProyectoID: proyecto.estadoProyectoID ?? 1,
            porcentajeAvance: proyecto.porcentajeAvance ?? "0.00",
            fechaInicio:toDate( proyecto.fechaInicio),
            fechaFin:toDate( proyecto.fechaFin),
            constructoraID: proyecto.constructoraID,
            descripcion: proyecto.descripcion,
            ubicacion: proyecto.ubicacion,
        });
        return (resultado as any).affectedRows ?? 0;
    }

    public async ActualizarProyecto(): Promise<number> {
        const proyecto = this._ObjProyecto!;


        const toDate = (v: string | Date | null | undefined): Date | null => {
        if (v == null || v === "") return null;
        if (v instanceof Date) return v;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;};

        const [resultado] = await db
        .update(proyectos)
        .set({
            nombre: proyecto.nombre,
            estadoProyectoID: proyecto.estadoProyectoID,
            porcentajeAvance: proyecto.porcentajeAvance,
            fechaInicio:toDate( proyecto.fechaInicio),
            fechaFin:toDate( proyecto.fechaFin),
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

    public async PerteneceAConstructora(constructoraID: number): Promise<boolean> {
        const [fila] = await db
        .select({ constructoraID: proyectos.constructoraID })
        .from(proyectos)
        .where(eq(proyectos.proyectoID, this._idProyecto!))
        .limit(1);

        return !!fila && fila.constructoraID === constructoraID;
    }

    public async ListarAvances() {
        return await db
        .select({
            avanceID: avancesproyecto.avanceID,
            porcentaje: avancesproyecto.porcentaje,
            nota: avancesproyecto.nota,
            fechaRegistro: avancesproyecto.fechaRegistro,
            registradoPor: usuarios.nombre,
        })
        .from(avancesproyecto)
        .innerJoin(usuarios, eq(avancesproyecto.usuarioID, usuarios.usuarioID))
        .where(eq(avancesproyecto.proyectoID, this._idProyecto!))
        .orderBy(desc(avancesproyecto.fechaRegistro));
    }

    public async ListarImagenes() {
        return await db
        .select({ imagenID: imagenesproyecto.imagenID, url: imagenesproyecto.url })
        .from(imagenesproyecto)
        .where(eq(imagenesproyecto.proyectoID, this._idProyecto!));
    }

    public async InsertarImagen(url: string): Promise<number> {
        const [resultado] = await db.insert(imagenesproyecto).values({
            proyectoID: this._idProyecto!,
            url,
        });
        return Number((resultado as any).insertId ?? 0);
    }

    /** Devuelve la URL eliminada (o null) para poder borrar el archivo en disco */
    public async EliminarImagen(imagenID: number): Promise<string | null> {
        const [fila] = await db
        .select({ url: imagenesproyecto.url, proyectoID: imagenesproyecto.proyectoID })
        .from(imagenesproyecto)
        .where(eq(imagenesproyecto.imagenID, imagenID))
        .limit(1);

        if (!fila || fila.proyectoID !== this._idProyecto) return null;

        await db.delete(imagenesproyecto).where(eq(imagenesproyecto.imagenID, imagenID));
        return fila.url;
    }

    public async CambiarEstado(estadoProyectoID: number): Promise<number> {
        const [resultado] = await db
        .update(proyectos)
        .set({ estadoProyectoID })
        .where(eq(proyectos.proyectoID, this._idProyecto!));
        return (resultado as any).affectedRows ?? 0;
    }

}
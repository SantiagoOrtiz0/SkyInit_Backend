import { db } from "./conexion.ts";
import { constructoras, propiedades, proyectos, estadosproyecto  } from "./schema.ts";
import {eq,sql  } from "../Dependencies/dependencias.ts"

interface constructoraData{
    constructoraID?: number;
    inmobiliariaID?: number ;
    usuarioID?: number ;
    nombre?: string;
    contacto?: string ;
    telefono?: string ;
    correo?: string ;
    estado?: string ;
    logo?: string ;
    descripcion?: string;
    ciudad?: string;
    }

export class Constructora {
    public _ObjConstructora: constructoraData | null;
    public _idConstructora: number | null;

    constructor(
        ObjConstructora: constructoraData | null = null,
        idConstructora: number | null = null,
    ) {
        this._ObjConstructora = ObjConstructora;
        this._idConstructora = idConstructora;
    }

    public async SeleccionarConstructoras() {
        return await db.select().from(constructoras);
    }

    public async SeleccionarConstructoraporId(){
        const [fila] = await db.select().from(constructoras).where(eq(constructoras.constructoraID, this._idConstructora!))
        .limit(1)
        return fila ?? null;
    }

    public async CrearConstructora() {
        const [resultado] = await db.insert(constructoras).values({
        inmobiliariaID: this._ObjConstructora?.inmobiliariaID ?? null,
        usuarioID: this._ObjConstructora?.usuarioID ?? null,
        nombre: this._ObjConstructora!.nombre!,
        contacto: this._ObjConstructora?.contacto ?? null,
        telefono: this._ObjConstructora?.telefono ?? null,
        correo: this._ObjConstructora?.correo ?? null,
        estado: this._ObjConstructora?.estado ?? "Pendiente",
        logo: this._ObjConstructora?.logo ?? null,
        descripcion: this._ObjConstructora!.descripcion!,
        ciudad: this._ObjConstructora?.ciudad ?? null,
        });

        return resultado;
    }

    public async ActualizarConstructora() {
        const resultado = await db
        .update(constructoras)
        .set({
            inmobiliariaID: this._ObjConstructora?.inmobiliariaID,
            usuarioID: this._ObjConstructora?.usuarioID,
            nombre: this._ObjConstructora?.nombre,
            contacto: this._ObjConstructora?.contacto,
            telefono: this._ObjConstructora?.telefono,
            correo: this._ObjConstructora?.correo,
            estado: this._ObjConstructora?.estado,
            logo: this._ObjConstructora?.logo,
            descripcion: this._ObjConstructora?.descripcion,
            ciudad: this._ObjConstructora?.ciudad,
        })
        .where(eq(constructoras.constructoraID, this._idConstructora!));

        return resultado;
    }


    public async EliminarConstructora() {
        const resultado = await db
        .delete(constructoras)
        .where(eq(constructoras.constructoraID, this._idConstructora!));

        return resultado;
    }

    public async ObtenerDashboard() {
        const id = this._idConstructora!;

        const [totalesPropiedades] = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(propiedades)
        .where(eq(propiedades.constructoraID, id));

        const propiedadesPorEstado = await db
        .select({ estado: propiedades.estado, total: sql<number>`COUNT(*)` })
        .from(propiedades)
        .where(eq(propiedades.constructoraID, id))
        .groupBy(propiedades.estado);

        const [totalesProyectos] = await db
        .select({ total: sql<number>`COUNT(*)`, avancePromedio: sql<number>`AVG(${proyectos.porcentajeAvance})` })
        .from(proyectos)
        .where(eq(proyectos.constructoraID, id));

        const proyectosPorEstado = await db
        .select({ estado: estadosproyecto.descripcion, total: sql<number>`COUNT(*)` })
        .from(proyectos)
        .innerJoin(estadosproyecto, eq(proyectos.estadoProyectoID, estadosproyecto.estadoProyectoID))
        .where(eq(proyectos.constructoraID, id))
        .groupBy(estadosproyecto.descripcion);

        return {
            totalPropiedades: Number(totalesPropiedades?.total ?? 0),
            propiedadesPorEstado,
            totalProyectos: Number(totalesProyectos?.total ?? 0),
            avancePromedioProyectos: Number(totalesProyectos?.avancePromedio ?? 0),
            proyectosPorEstado,
        };
    }

    public async ActualizarPerfil() {
        const resultado = await db
        .update(constructoras)
        .set({
            nombre: this._ObjConstructora?.nombre,
            descripcion: this._ObjConstructora?.descripcion,
            contacto: this._ObjConstructora?.contacto,
            telefono: this._ObjConstructora?.telefono,
        })
        .where(eq(constructoras.constructoraID, this._idConstructora!));

        return resultado;
    }

    public async ActualizarLogo(url: string) {
        const resultado = await db
        .update(constructoras)
        .set({ logo: url })
        .where(eq(constructoras.constructoraID, this._idConstructora!));

        return resultado;
    }
}

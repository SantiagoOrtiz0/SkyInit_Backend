import { db } from "./conexion.ts";
import { constructoras } from "./schema.ts";
import {eq} from "../Dependencies/dependencias.ts"

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
}

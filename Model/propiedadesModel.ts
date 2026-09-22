import { eq, and, like, gte ,lte, desc, asc} from "../Dependencies/dependencias.ts";
import { db } from "./conexion.ts";
import { propiedades,tiposoperacion,constructoras, usuarios, imagenespropiedad } from "./schema.ts";

interface PropiedadData {
    titulo: string;
    descripcion?: string | null;
    precio: string;
    tipoOperacionID: number;
    habitaciones?: number | null;
    direccion: string;
    ciudad?: string | null;
    constructoraID?: number | null;
    agenteID?: number | null;
    estado?: "Disponible" | "Reservada" | "En mantenimiento" | "Fuera del mercado";
    destacada?: boolean;
}

interface FiltrosPropiedad {
    ciudad?: string;
    tipoOperacionID?: number;
    habitaciones?: number;
    precioMin?: number;
    precioMax?: number;
    orden?: "precio_asc" | "precio_desc" | "fecha";
}

export class Propiedad {
    public _ObjPropiedad: PropiedadData | null;
    public _idPropiedad: number | null;

    constructor(ObjPropiedad: PropiedadData | null = null, idPropiedad: number | null = null) {
        this._ObjPropiedad = ObjPropiedad;
        this._idPropiedad = idPropiedad;
    }

    // Trea los datos de la propiedad con tipo de operación, agente, constructora e imagenes
    public async ConsultarPropiedad() {
        const [propiedad] = await db.select({
            propiedadID: propiedades.propiedadID,
            titulo: propiedades.titulo,
            descripcion: propiedades.descripcion,
            precio: propiedades.precio,
            tipoOperacionID: propiedades.tipoOperacionID,
            habitaciones: propiedades.habitaciones,
            direccion: propiedades.direccion,
            ciudad: propiedades.ciudad,
            estado: propiedades.estado,
            destacada: propiedades.destacada,
            fechaPublicacion: propiedades.fechaPublicacion,
            tipoOperacion: tiposoperacion.descripcion,
            agenteNombre: usuarios.nombre,
            agenteCorreo: usuarios.correo,
            constructoraNombre: constructoras.nombre,
        })
        .from(propiedades)
        .innerJoin(tiposoperacion, eq(propiedades.tipoOperacionID, tiposoperacion.tipoOperacionID))
        .leftJoin(usuarios, eq(propiedades.agenteID, usuarios.usuarioID))
        .leftJoin(constructoras, eq(propiedades.constructoraID, constructoras.constructoraID))
        .where(eq(propiedades.propiedadID, this._idPropiedad!));

        if(!propiedad) return null;

        const imagenes = await db
        .select({url: imagenespropiedad.url})
        .from(imagenespropiedad)
        .where(eq(imagenespropiedad.propiedadID, this._idPropiedad!));

        return {...propiedad, imagenes:imagenes.map((i) => i.url)};
    }


    // Filtrado por ubicacion, habitaciones, precio y ordenar propiedades

    public async SeleccionarPropiedades(filtros: FiltrosPropiedad = {}) {
        const condiciones = [];

        if(filtros.ciudad) condiciones.push(like(propiedades.ciudad, `%${filtros.ciudad}%`));
        if(filtros.tipoOperacionID) condiciones.push(eq(propiedades.tipoOperacionID, filtros.tipoOperacionID));
        if(filtros.habitaciones) condiciones.push(eq(propiedades.habitaciones, filtros.habitaciones));
        if(filtros.precioMin) condiciones.push(gte(propiedades.precio, String(filtros.precioMin)));
        if(filtros.precioMax) condiciones.push(lte(propiedades.precio, String(filtros.precioMax)));

        const query = db.select({
            propiedadID: propiedades.propiedadID,
            titulo: propiedades.titulo,
            precio: propiedades.precio,
            habitaciones: propiedades.habitaciones,
            direccion: propiedades.direccion,
            ciudad: propiedades.ciudad,
            estado: propiedades.estado,
            destacada: propiedades.destacada,
            fechaPublicacion: propiedades.fechaPublicacion,
            tipoOperacion: tiposoperacion.descripcion,
        })
        .from(propiedades)
        .innerJoin(tiposoperacion, eq(propiedades.tipoOperacionID, tiposoperacion.tipoOperacionID))
        .where(condiciones.length ? and(...condiciones): undefined);

        switch (filtros.orden) {
            case "precio_asc":
                return await query.orderBy(asc(propiedades.precio));
            case "precio_desc":
                return await query.orderBy(desc(propiedades.precio));
            case "fecha":
                return await query.orderBy(desc(propiedades.fechaPublicacion));
            default:
                return await query;
        }
    }

    // Propiedades destacadas 
    public async SeleccionarDestacadas() {
        return await db
        .select()
        .from(propiedades)
        .where(eq(propiedades.destacada, 1))
        .orderBy(desc(propiedades.fechaPublicacion));
    }

    // Propiedades similares
    public async SeleccionarSimilares(ciudad: string, tipoOperacionID: number) {
        return await db
        .select()
        .from(propiedades)
        .where(
            and(
                eq(propiedades.ciudad, ciudad),
                eq(propiedades.tipoOperacionID, tipoOperacionID),
                eq(propiedades.estado, "Disponible"),
            ),
        )
        .limit(6);
    }

    // Propiedades del agente

    public async SeleccionarPorAgente(agenteID: number) {
        return await db.select().from(propiedades).where(eq(propiedades.agenteID, agenteID));
    }

    // Registrar una nueva propiedad (Agente, administrador)
    public async InsertarPropiedad(): Promise<number> {
        const propiedad = this._ObjPropiedad!;
        const [resultado] = await db.insert(propiedades).values({
            titulo: propiedad.titulo,
            descripcion: propiedad.descripcion,
            precio: propiedad.precio,
            tipoOperacionID: propiedad.tipoOperacionID,
            habitaciones: propiedad.habitaciones,
            direccion: propiedad.direccion,
            ciudad: propiedad.ciudad,
            constructoraID: propiedad.constructoraID,
            agenteID: propiedad.agenteID,
            estado: propiedad.estado ?? "Disponible",
            destacada: propiedad.destacada ? 1 : 0,
        });
        return (resultado as any).affectedRows ?? 0;
    }

    // Editar propiedades
    public async ActualizarPropiedad(): Promise<number> {
        const propiedad = this._ObjPropiedad!;
        const [resultado] = await db
        .update(propiedades)
        .set({
            titulo: propiedad.titulo,
            descripcion: propiedad.descripcion,
            precio: propiedad.precio,
            tipoOperacionID: propiedad.tipoOperacionID,
            habitaciones: propiedad.habitaciones,
            direccion: propiedad.direccion,
            ciudad: propiedad.ciudad,
            constructoraID: propiedad.constructoraID,
            agenteID: propiedad.agenteID,
            estado: propiedad.estado,
            destacada: propiedad.destacada === undefined ? undefined : (propiedad.destacada ? 1 : 0),
        })
        .where(eq(propiedades.propiedadID, this._idPropiedad!));
        return (resultado as any).affectedRows ?? 0;
    }

    // Eliminar propiedades
    public async EliminarPropiedad(): Promise <number> {
        const [resultado] = await db
        .delete(propiedades)
        .where(eq(propiedades.propiedadID, this._idPropiedad!));
        return (resultado as any).affectedRows ?? 0;
    }

}

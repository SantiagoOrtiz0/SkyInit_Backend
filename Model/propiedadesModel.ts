import { eq, and, like, gte ,lte, desc, asc, inArray} from "../Dependencies/dependencias.ts";
import { db } from "./conexion.ts";
import { propiedades,tiposoperacion,constructoras, usuarios, imagenespropiedad} from "./schema.ts";

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
    inmobiliariaID?: number | null;
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

        public async SeleccionarTodasAdmin() {
            const filas = await db.select({
            propiedadID: propiedades.propiedadID,
            titulo: propiedades.titulo,
            descripcion: propiedades.descripcion,
            precio: propiedades.precio,
            habitaciones: propiedades.habitaciones,
            direccion: propiedades.direccion,
            ciudad: propiedades.ciudad,
            estado: propiedades.estado,
            destacada: propiedades.destacada,
            tipoOperacionID: propiedades.tipoOperacionID,
            tipoOperacion: tiposoperacion.descripcion,
            agenteID: propiedades.agenteID,
            agenteNombre: usuarios.nombre,
            constructoraID: propiedades.constructoraID,
            constructoraNombre: constructoras.nombre,
        })
        .from(propiedades)
        .innerJoin(tiposoperacion, eq(propiedades.tipoOperacionID, tiposoperacion.tipoOperacionID))
        .leftJoin(usuarios, eq(propiedades.agenteID, usuarios.usuarioID))
        .leftJoin(constructoras, eq(propiedades.constructoraID, constructoras.constructoraID))
        .orderBy(desc(propiedades.fechaPublicacion));
        return await this.AdjuntarImagenPrincipal(filas);
    }
        // Trea los datos de la propiedad con tipo de operación, agente, constructora e imagenes
        public async ConsultarPropiedad(soloDisponibles = true) {
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
                agenteID: propiedades.agenteID,
                constructoraID: propiedades.constructoraID,
                constructoraNombre: constructoras.nombre,
            })
            .from(propiedades)
            .innerJoin(tiposoperacion, eq(propiedades.tipoOperacionID, tiposoperacion.tipoOperacionID),) 
            .leftJoin(constructoras, eq(propiedades.constructoraID, constructoras.constructoraID),)
            .where(
                and(
                eq(propiedades.propiedadID, this._idPropiedad!),
                soloDisponibles ? eq(propiedades.estado, "Disponible") : undefined,
            ),
        );

            if(!propiedad) return null;
            let agenteNombre: string | null = null;
            let agenteCorreo: string | null = null;
            let agenteTelefono: string | null = null;

        if (propiedad.agenteID) {
            const [agente] = await db
                .select({
                    nombre: usuarios.nombre,
                    correo: usuarios.correo,
                    telefono: usuarios.telefono,
                })
                .from(usuarios)
                .where(eq(usuarios.usuarioID, propiedad.agenteID))
                .limit(1);

            if (agente) {
                agenteNombre = agente.nombre ?? null;
                agenteCorreo = agente.correo ?? null;
                agenteTelefono = agente.telefono ?? null;
            }
        }

            const imagenes = await db
            .select({
                imagenID :imagenespropiedad.imagenID,
                url: imagenespropiedad.url})
            .from(imagenespropiedad)
            .where(eq(imagenespropiedad.propiedadID, this._idPropiedad!));

            return {...propiedad, agenteNombre, agenteCorreo, agenteTelefono, imagenes,};
        }


        // Filtrado por ubicacion, habitaciones, precio y ordenar propiedades

        public async SeleccionarPropiedades(filtros: FiltrosPropiedad = {}) {
            const condiciones = [];

            condiciones.push(eq(propiedades.estado, "Disponible"));
            if(filtros.ciudad) condiciones.push(like(propiedades.ciudad, `%${filtros.ciudad}%`));
            if(filtros.tipoOperacionID) condiciones.push(eq(propiedades.tipoOperacionID, filtros.tipoOperacionID));
            if(filtros.habitaciones) condiciones.push(eq(propiedades.habitaciones, filtros.habitaciones));
            if(filtros.precioMin) condiciones.push(gte(propiedades.precio, String(filtros.precioMin)));
            if(filtros.precioMax) condiciones.push(lte(propiedades.precio, String(filtros.precioMax)));

            const query = db.select({
                propiedadID: propiedades.propiedadID,
                titulo: propiedades.titulo,
                descripcion: propiedades.descripcion,
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

            let resultados;
            switch (filtros.orden) {
                case "precio_asc":
                    resultados = await query.orderBy(asc(propiedades.precio));
                    break;
                case "precio_desc":
                    resultados = await query.orderBy(desc(propiedades.precio));
                    break;
                case "fecha":
                    resultados = await query.orderBy(desc(propiedades.fechaPublicacion));
                    break;
                default:
                    resultados = await query;
            }

            return await this.AdjuntarImagenPrincipal(resultados);
        }

        // Trae la imagen principal de cada propiedad y la agrega como imagen principal
        private async AdjuntarImagenPrincipal<T extends {propiedadID: number}>(lista: T[]) {
            if (lista.length === 0) return lista.map((p) => ({ ...p, imagenPrincipal: null as string | null }));

            const ids = lista.map((p) => p.propiedadID);
            const imagenes = await db
            .select({ propiedadID: imagenespropiedad.propiedadID, url: imagenespropiedad.url })
            .from(imagenespropiedad)
            .where(inArray(imagenespropiedad.propiedadID, ids));

            const mapaImagenes = new Map<number, string>();
            for (const img of imagenes) {
                if (!mapaImagenes.has(img.propiedadID)) mapaImagenes.set(img.propiedadID, img.url);
            }

            return lista.map((p) => ({ ...p, imagenPrincipal: mapaImagenes.get(p.propiedadID) ?? null}));
        }

        // Propiedades destacadas 
        public async SeleccionarDestacadas() {
            const resultados = await db
            .select()
            .from(propiedades)
            .where(eq(propiedades.destacada, 1))
            .orderBy(desc(propiedades.fechaPublicacion));

            return await this.AdjuntarImagenPrincipal(resultados);
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
            inmobiliariaID: propiedad.inmobiliariaID ?? null,
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
            inmobiliariaID: propiedad.inmobiliariaID,
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

        public async SeleccionarPorConstructora(constructoraID: number) {
            const rows = await db
            .select({
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
            .where(eq(propiedades.constructoraID, constructoraID))
            .orderBy(desc(propiedades.fechaPublicacion));

            return await Promise.all(
                rows.map(async (p) => {
                const imgs = await db
                    .select({ url: imagenespropiedad.url })
                    .from(imagenespropiedad)
                    .where(eq(imagenespropiedad.propiedadID, p.propiedadID));
                return {
                    ...p,
                    totalImagenes: imgs.length,
                    imagenUrl: imgs[0]?.url ?? null,
                };
                }),
            );
        }

        public async PerteneceAConstructora(constructoraID: number): Promise<boolean> {
            const [fila] = await db
            .select({ constructoraID: propiedades.constructoraID })
            .from(propiedades)
            .where(eq(propiedades.propiedadID, this._idPropiedad!))
            .limit(1);

            return !!fila && fila.constructoraID === constructoraID;
        }
        // Confirma que la propiedad sea del agente autenticado (para proteger la subida y el borrado de imagenes)
        public async PerteneceAAgente(agenteID: number): Promise<boolean> {
            const [fila] = await db
            .select({ agenteID: propiedades.agenteID })
            .from(propiedades)
            .where(eq(propiedades.propiedadID, this._idPropiedad!))
            .limit(1);

            return !!fila && fila.agenteID === agenteID;
        }

        public async InsertarImagen(url: string): Promise<number> {
            const [resultado] = await db.insert(imagenespropiedad).values({
                propiedadID: this._idPropiedad!,
                url,
            });
            return Number((resultado as any).insertId ?? 0);
        }

        public async EliminarImagen(imagenID: number): Promise<string | null> {
            const [fila] = await db
                .select({ url: imagenespropiedad.url, propiedadID: imagenespropiedad.propiedadID })
                .from(imagenespropiedad)
                .where(eq(imagenespropiedad.imagenID, imagenID))
                .limit(1);

            if (!fila || fila.propiedadID !== this._idPropiedad) return null;

            await db.delete(imagenespropiedad).where(eq(imagenespropiedad.imagenID, imagenID));
            return fila.url;
        }


    // Para el panel de la inmobiliaria
    public async SeleccionarPorInmobiliaria(inmobiliariaID: number, filtros: FiltrosPropiedad = {}) {
        const condiciones = [eq(propiedades.inmobiliariaID, inmobiliariaID)];

        if (filtros.ciudad) condiciones.push(like(propiedades.ciudad, `%${filtros.ciudad}%`));
        if (filtros.tipoOperacionID) condiciones.push(eq(propiedades.tipoOperacionID, filtros.tipoOperacionID));
        if (filtros.habitaciones) condiciones.push(eq(propiedades.habitaciones, filtros.habitaciones));
        if (filtros.precioMin) condiciones.push(gte(propiedades.precio, String(filtros.precioMin)));
        if (filtros.precioMax) condiciones.push(lte(propiedades.precio, String(filtros.precioMax)));

        const query = db.select({
            propiedadID: propiedades.propiedadID,
            titulo: propiedades.titulo,
            descripcion: propiedades.descripcion,
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
            .where(and(...condiciones));

        let resultados;
        switch (filtros.orden) {
            case "precio_asc": resultados = await query.orderBy(asc(propiedades.precio)); break;
            case "precio_desc": resultados = await query.orderBy(desc(propiedades.precio)); break;
            case "fecha": resultados = await query.orderBy(desc(propiedades.fechaPublicacion)); break;
            default: resultados = await query;
        }
        return await this.AdjuntarImagenPrincipal(resultados);
    }

    // Falta este método — para verificar ownership antes de editar/eliminar
    public async PerteneceAInmobiliaria(inmobiliariaID: number): Promise<boolean> {
        const [fila] = await db
            .select({ inmobiliariaID: propiedades.inmobiliariaID })
            .from(propiedades)
            .where(eq(propiedades.propiedadID, this._idPropiedad!))
            .limit(1);
        return !!fila && fila.inmobiliariaID === inmobiliariaID;
    }
}

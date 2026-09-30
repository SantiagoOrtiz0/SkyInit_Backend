import { Context, eq } from "../Dependencies/dependencias.ts";
import { Propiedad } from "../Model/propiedadesModel.ts";
import { guardarImagen, eliminarImagenDisco } from "../Helpers/upload.ts";
import { db } from "../Model/conexion.ts";
import { constructoras } from "../Model/schema.ts";

// Listar propiedades con filtros (Publica)
export const listarPropiedades = async (ctx:Context) => {
    try {
        const params = ctx.request.url.searchParams;
        const modeloPropiedad = new Propiedad();

        const propiedades = await modeloPropiedad.SeleccionarPropiedades({
            ciudad: params.get("ciudad") ?? undefined,
            tipoOperacionID: params.get("tipoOperacionID") ? Number(params.get("tipoOperacionID")) : undefined,
            habitaciones: params.get("habitaciones") ? Number(params.get("habitaciones")) : undefined,
            precioMin: params.get("precioMin") ? Number(params.get("precioMin")) : undefined,
            precioMax: params.get("precioMax") ? Number(params.get("precioMax")) : undefined,
            orden: (params.get("orden") as "precio_asc" | "precio_desc" | "fecha") ?? undefined,
        });

        ctx.response.status = 200;
        ctx.response.body = propiedades;
    } catch (error) {
        console.log(error);
        ctx.response.status = 500;
        ctx.response.body = {error: "Error al listar las propiedades"};
    }
};

// Listar propiedades destacadas (Publica)
export const listarDestacadas = async (ctx:Context) => {
    try {
        const modeloPropiedad = new Propiedad();
        const propiedades = await modeloPropiedad.SeleccionarDestacadas();

        ctx.response.status = 200;
        ctx.response.body = propiedades;
    } catch (error) {
        console.log(error);
        ctx.response.status = 500;
        ctx.response.body = {error: "Error al listar las propiedades destacadas"};
    }
};

//Listar propiedades de un agente (Publica)
export const listarPorAgente = async (ctx:any) => {
    try {
        const {agenteID} = ctx.params;
        const modeloPropiedad = new Propiedad();
        const propiedades = await modeloPropiedad.SeleccionarPorAgente(Number(agenteID));

        ctx.response.status = 200;
        ctx.response.body = propiedades;
    } catch (error) {
        console.log(error);
        ctx.response.status = 500;
        ctx.response.body = {error: "Error al listar las propiedades del agente"};
    }
};

//Consultar propiedad por id (Publica)
export const consultarPropiedad = async (ctx:any) => {
    try {
        const {id} = ctx.params;
        const modeloPropiedad = new Propiedad(null, Number(id));
        const propiedad = await modeloPropiedad.ConsultarPropiedad();

        if (!propiedad) {
            ctx.response.status = 404;
            ctx.response.body = {error: "No ha sido encontrada la propiedad consultada"};
            return;
        }
            // Solo campos publicos
            const { descripcion, agenteNombre, agenteCorreo, constructoraNombre, ...publico} = propiedad;
            ctx.response.status = 200;
            ctx.response.body = { propiedad: publico};
    } catch (error) {
        console.log(error);
        ctx.response.status = 500;
        ctx.response.body = {error: "Error al consultar la propiedad, no se pudo procesar la solicitud"};
    }
};

// Consultar propiedad por id - campos completos (Privada) - Muestra la información completa para un usuario logueado
export const consultarPropiedadDetalle = async (ctx:any) => {
    try {
        const { id } = ctx.params;
        const modeloPropiedad = new Propiedad(null, Number(id));
        const propiedad = await modeloPropiedad.ConsultarPropiedad();

        if (!propiedad) {
            ctx.response.status = 404;
            ctx.response.body = { error: "Propiedad no encontrada o no disponible"};
            return;
        }
        ctx.response.status = 200;
        ctx.response.body = { propiedad };
    } catch (error) {
        console.log(error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Error al consultar el detalle de la propiedad"};
    }
};

//Listar propiedades similares (Publica)
export const listarSimilares = async (ctx:any) => {
    try {
        const {id} = ctx.params;
        const modeloPropiedad = new Propiedad(null, Number(id));
        const propiedad = await modeloPropiedad.ConsultarPropiedad();

        if (!propiedad) {
            ctx.response.status = 404;
            ctx.response.body = {error: "No ha sido encontrada la propiedad consultada"};
            return;
        }

        if (!propiedad.ciudad) {
            ctx.response.status = 200;
            ctx.response.body = [];
            return;
        }

        const similares = await new Propiedad().SeleccionarSimilares(propiedad.ciudad, propiedad.tipoOperacionID);
        ctx.response.status = 200;
        ctx.response.body = similares.filter((p) => p.propiedadID !== Number(id));

    } catch (error) {
        console.log(error);
        ctx.response.status = 500;
        ctx.response.body = {error: "Error al listar las propiedades similares"};
    }
};

// Crear propiedad (Privado y protegido el acceso unicamente debe ser para agente y administrador)
export const crearPropiedad = async (ctx:Context) => {
    try {
        const body = await ctx.request.body.json();
        const {titulo, descripcion, precio, tipoOperacionID, habitaciones, direccion, ciudad, constructoraID, agenteID, estado, destacada} = body;

        if (!titulo || !precio || !tipoOperacionID || !direccion) {
            ctx.response.status = 400;
            ctx.response.body = {error: "Titulo, precio, tipoOperacionID y direccion son obligatorios"};
            return;
        }

        const usuario = (ctx.state as any).user;
        const idAgente = agenteID ?? Number(usuario?.sub);

        if (!idAgente) {
            ctx.response.status = 400;
            ctx.response.body = {error: "No fue posible determinar el agente de la propiedad"};
            return;
        }

        const nuevaPropiedad = new Propiedad({
            titulo,
            descripcion: descripcion ?? null,
            precio: String(precio),
            tipoOperacionID: Number(tipoOperacionID),
            habitaciones: habitaciones ?? null,
            direccion,
            ciudad: ciudad ?? null,
            constructoraID: constructoraID ?? null,
            agenteID: idAgente,
            estado: estado ?? "Disponible",
            destacada: destacada ?? false,
        });

        const filasAfectadas = await nuevaPropiedad.InsertarPropiedad();

        if (filasAfectadas > 0) {
            ctx.response.status = 201;
            ctx.response.body = {message: "Propiedad creada correctamente"};
        } else {
            ctx.response.status = 409;
            ctx.response.body = {error: "No se pudo crear la propiedad"};
        }
    } catch (error) {
        console.log(error);
        ctx.response.status = 500;
        ctx.response.body = {error: "Error interno al crear la propiedad"};
    }
};

// Editar propiedad (Privado y protegido. El acceso debe ser unicamente para agente y administrador)
export const editarPropiedad = async (ctx:any) => {
    try {
        const {id} = ctx.params;
        const idPropiedad = Number(id);

        if (Number.isNaN(idPropiedad)) {
            ctx.response.status = 400;
            ctx.response.body = { error: "ID de propiedad invalido" };
            return;
        }
        if (!(await puedeGestionarPropiedad(ctx, idPropiedad))) {
            ctx.response.status = 403;
            ctx.response.body = { error: "No tienes permisos sobre esta propiedad" };
            return;
        }

        const body = await ctx.request.body.json();
        const {titulo, descripcion, precio, tipoOperacionID, habitaciones, direccion, ciudad, constructoraID, agenteID, estado, destacada} = body;

        if (!titulo || !precio || !tipoOperacionID || !direccion) {
            ctx.response.status = 400;
            ctx.response.body = {error: "Titulo, precio, tipoOperacionID y direccion son obligatorios"};
            return;
        }

        const propiedadEditada = new Propiedad({
            titulo,
            descripcion: descripcion ?? null,
            precio: String(precio),
            tipoOperacionID: Number(tipoOperacionID),
            habitaciones: habitaciones ?? null,
            direccion,
            ciudad: ciudad ?? null,
            constructoraID: constructoraID ?? null,
            agenteID: agenteID ?? null,
            estado: estado ?? "Disponible",
            destacada: destacada ?? false,
        },
        Number(id)
    );

    const filasAfectadas = await propiedadEditada.ActualizarPropiedad();
    if (filasAfectadas > 0) {
        ctx.response.status = 200;
        ctx.response.body = {message: "Propiedad actualizada correctamente"};
    } else {
        ctx.response.status = 404;
        ctx.response.body = {error: "Propiedad no encontrada o sin cambios"};
    }
    } catch (error) {
        console.log(error);
        ctx.response.status = 500;
        ctx.response.body = {error: "Error al editar la propiedad"};
    }
};

// Eliminar propiedad (Privado y protege.El acceso debe ser unicamente para agente y administrador)
export const eliminarPropiedad = async (ctx: any) => {
    try {
        const {id} = ctx.params;
        const idPropiedad = Number(id);

        if (Number.isNaN(idPropiedad)) {
            ctx.response.status = 400;
            ctx.response.body = { error: "ID de propiedad invalido" };
            return;
        }

        if(!(await puedeGestionarPropiedad(ctx, idPropiedad))) {
            ctx.response.status = 403;
            ctx.response.body = { error: "No tiene permisos sobre esta propiedad" };
            return;
        }
        const modeloPropiedad = new Propiedad(null, Number(id));
        const filasAfectadas = await modeloPropiedad.EliminarPropiedad();

        if (filasAfectadas > 0) {
            ctx.response.status = 200;
            ctx.response.body = {message: "Propiedad eliminada correctamente"};
        } else {
            ctx.response.status = 404;
            ctx.response.body = {error: "Propiedad no encontrada"};
        }
    } catch (error) {
        console.log(error);
        ctx.response.status = 500;
        ctx.response.body = {error: "Error al eliminar la propiedad"};
    }
};
// Verifica que el agente autenticado sea dueño de la propiedad (El administrador no tendra restriccion)
async function puedeGestionarPropiedad(ctx: any, idPropiedad: number): Promise<boolean> {
    const usuario = ctx.state.user as { sub?: string; rol?: string } |undefined;
     const modeloPropiedad = new Propiedad(null, idPropiedad);
    if (usuario?.rol === "Administrador") return true; //Sin restriccion
    if (usuario?.rol === "Constructora") {
        const [fila] = await db
        .select({ constructoraID: constructoras.constructoraID, estado: constructoras.estado})
        .from((constructoras))
        .where(eq(constructoras.usuarioID, Number(usuario?.sub)))
        .limit(1);

        if (!fila || fila.estado !== "Activo") return false;

        return await modeloPropiedad.PerteneceAConstructora(fila.constructoraID);
    }
    return await modeloPropiedad.PerteneceAAgente(Number(usuario?.sub));
}

export const postImagenPropiedad = async (ctx: any) => {

    let urlGuardada: string | undefined;
    try {
        const { id } = ctx.params;
        const idPropiedad = Number(id);

         if (Number.isNaN(idPropiedad)) {
             ctx.response.status = 400;
             ctx.response.body = { error: "ID de propiedad invalido"};
        return;
    }
        if (!(await puedeGestionarPropiedad(ctx, idPropiedad))) {
            ctx.response.status = 403;
            ctx.response.body = { error: "No tienes permisos sobre esta propiedad" };
            return;
        }

        const form = await ctx.request.body.formData();
        const archivo = form.get("imagen");

        if (!(archivo instanceof File)) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Debes enviar un archivo 'imagen'" };
            return;
        }

        const resultado = await guardarImagen(archivo, "propiedades");

        if (!resultado.url) {
            ctx.response.status = 400;
            ctx.response.body = { error: resultado.error ?? "No se pudo guardar la imagen" };
            return;
        }
        urlGuardada = resultado.url;
        const modeloPropiedad = new Propiedad(null, idPropiedad);
        const imagenID = await modeloPropiedad.InsertarImagen(resultado.url);

        ctx.response.status = 201;
        ctx.response.body = { message: "Imagen agregada", data: { imagenID, url: resultado.url }};
    } catch (error) {
        console.log(error);
        await eliminarImagenDisco(urlGuardada);
        ctx.response.status = 500;
        ctx.response.body = { error: "Error al subir la imagen de la propiedad" };
    }
};

export const deleteImagenPropiedad = async (ctx: any) => {
    try {
        const { id, imagenID } = ctx.params;
        const idPropiedad = Number(id);
        const IdImagen = Number(imagenID);

        if (Number.isNaN(idPropiedad) || Number.isNaN(IdImagen)) {
             ctx.response.status = 400;
             ctx.response.body = { error: "ID invalido" };
            return;
        }
        
        if (!(await puedeGestionarPropiedad(ctx, idPropiedad))) {
            ctx.response.status = 403;
            ctx.response.body = { error: "No tienes permisos sobre esta propiedad" };
            return;
        }

        const modeloPropiedad = new Propiedad(null, idPropiedad);
        const url = await modeloPropiedad.EliminarImagen(IdImagen);
        // La imagen no existe o no pertenece a esta propiedad
        if (url === null) {
            ctx.response.status = 404;
            ctx.response.body = { error: "Imagen no encontrada" };
            return;
        }

        // La fila ya se borra de la BD, ahora se borra el archivo del disco
        await eliminarImagenDisco(url);

        ctx.response.status = 200;
        ctx.response.body = { message: "Imagen eliminada correctamente" };
    } catch (error) {
        console.log(error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Error al eliminar la imagen de la propiedad"};
    }
};
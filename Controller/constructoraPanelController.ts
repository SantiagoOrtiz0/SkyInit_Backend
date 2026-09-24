import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { Constructora } from "../Model/constructoraModel.ts";
import { Proyecto } from "../Model/proyectosModel.ts";
import { Propiedad } from "../Model/propiedadesModel.ts";
import { guardarImagen, eliminarImagenDisco } from "../Helpers/upload.ts";

// Helper local: castea el state con el que dejamos constructoraID
type CtxConstructora = Context & { state: { constructoraID: number } };

export const getDashboard = async (ctx: Context) => {
    const { response, state } = ctx as CtxConstructora;
    try {
        const constructora = new Constructora(null, state.constructoraID);
        const data = await constructora.ObtenerDashboard();
        response.status = 200;
        response.body = { success: true, data };
    } catch (error) {
        console.error("ERROR AL OBTENER DASHBOARD:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al obtener el dashboard" };
    }
};

export const getPerfil = async (ctx: Context) => {
    const { response, state } = ctx as CtxConstructora;
    try {
        const constructora = new Constructora(null, state.constructoraID);
        const data = await constructora.SeleccionarConstructoraporId();
        response.status = 200;
        response.body = { success: true, data };
    } catch (error) {
        console.error("ERROR AL OBTENER PERFIL:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al obtener el perfil" };
    }
};

export const putPerfil = async (ctx: Context) => {
    const { response, request, state } = ctx as CtxConstructora;
    try {
        const body = await request.body.json();
        const { nombre, descripcion, contacto, telefono } = body;

        if (!nombre || !descripcion) {
            response.status = 400;
            response.body = { success: false, message: "Nombre y descripcion son obligatorios" };
            return;
        }

        const constructora = new Constructora({ nombre, descripcion, contacto, telefono }, state.constructoraID);
        await constructora.ActualizarPerfil();

        response.status = 200;
        response.body = { success: true, message: "Perfil actualizado correctamente" };
    } catch (error) {
        console.error("ERROR AL ACTUALIZAR PERFIL:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al actualizar el perfil" };
    }
};

export const postLogo = async (ctx: Context) => {
    const { response, request, state } = ctx as CtxConstructora;
    try {
        const form = await request.body.formData();
        const archivo = form.get("logo");

        if (!(archivo instanceof File)) {
            response.status = 400;
            response.body = { success: false, message: "Debes enviar un archivo 'logo'" };
            return;
        }

        const resultado = await guardarImagen(archivo, "constructoras");
        if (!resultado.ok) {
            response.status = 400;
            response.body = { success: false, message: resultado.error };
            return;
        }

        const actual = new Constructora(null, state.constructoraID);
        const datosActuales = await actual.SeleccionarConstructoraporId();
        await eliminarImagenDisco(datosActuales?.logo);

        const constructora = new Constructora(null, state.constructoraID);
        await constructora.ActualizarLogo(resultado.url!);

        response.status = 200;
        response.body = { success: true, message: "Logo actualizado correctamente", url: resultado.url };
    } catch (error) {
        console.error("ERROR AL SUBIR LOGO:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al subir el logo" };
    }
};

export const getProyectos = async (ctx: Context) => {
    const { response, state } = ctx as CtxConstructora;
    try {
        const proyecto = new Proyecto();
        const data = await proyecto.SeleccionarPorConstructora(state.constructoraID);
        response.status = 200;
        response.body = { success: true, data };
    } catch (error) {
        console.error("ERROR AL LISTAR PROYECTOS:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al listar los proyectos" };
    }
};

export const getProyectoPorId = async (ctx: RouterContext<"/panel/constructora/proyectos/:id">) => {
    const { response, params, state } = ctx as typeof ctx & { state: { constructoraID: number } };
    try {
        const id = Number(params.id);
        const proyecto = new Proyecto(null, id);

        if (!(await proyecto.PerteneceAConstructora(state.constructoraID))) {
            response.status = 404;
            response.body = { success: false, message: "Proyecto no encontrado" };
            return;
        }

        const data = await proyecto.ConsultarProyecto();
        response.status = 200;
        response.body = { success: true, data };
    } catch (error) {
        console.error("ERROR AL CONSULTAR PROYECTO:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al consultar el proyecto" };
    }
};

export const postProyecto = async (ctx: Context) => {
    const { response, request, state } = ctx as CtxConstructora;
    try {
        const body = await request.body.json();
        const { nombre, fechaInicio, fechaFin, descripcion, ubicacion } = body;

        if (!nombre) {
            response.status = 400;
            response.body = { success: false, message: "El nombre del proyecto es obligatorio" };
            return;
        }

        const proyecto = new Proyecto({
            nombre,
            estadoProyectoID: 1,
            fechaInicio: fechaInicio ?? null,
            fechaFin: fechaFin ?? null,
            constructoraID: state.constructoraID,
            descripcion: descripcion ?? null,
            ubicacion: ubicacion ?? null,
        });

        const id = await proyecto.InsertarProyecto();
        response.status = 201;
        response.body = { success: true, message: "Proyecto creado correctamente", data: { proyectoID: id } };
    } catch (error) {
        console.error("ERROR AL CREAR PROYECTO:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al crear el proyecto" };
    }
};

export const putProyecto = async (ctx: RouterContext<"/panel/constructora/proyectos/:id">) => {
    const { response, params, request, state } = ctx as typeof ctx & { state: { constructoraID: number } };
    try {
        const id = Number(params.id);
        const proyectoCheck = new Proyecto(null, id);
        if (!(await proyectoCheck.PerteneceAConstructora(state.constructoraID))) {
            response.status = 404;
            response.body = { success: false, message: "Proyecto no encontrado" };
            return;
        }

        const body = await request.body.json();
        const { nombre, fechaInicio, fechaFin, descripcion, ubicacion } = body;

        if (!nombre) {
            response.status = 400;
            response.body = { success: false, message: "El nombre del proyecto es obligatorio" };
            return;
        }

        const proyecto = new Proyecto({ nombre, fechaInicio, fechaFin, descripcion, ubicacion }, id);
        await proyecto.ActualizarProyecto();

        response.status = 200;
        response.body = { success: true, message: "Proyecto actualizado correctamente" };
    } catch (error) {
        console.error("ERROR AL ACTUALIZAR PROYECTO:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al actualizar el proyecto" };
    }
};

export const patchEstadoProyecto = async (ctx: RouterContext<"/panel/constructora/proyectos/:id/estado">) => {
    const { response, params, request, state } = ctx as typeof ctx & { state: { constructoraID: number } };
    try {
        const id = Number(params.id);
        const proyecto = new Proyecto(null, id);
        if (!(await proyecto.PerteneceAConstructora(state.constructoraID))) {
            response.status = 404;
            response.body = { success: false, message: "Proyecto no encontrado" };
            return;
        }

        const body = await request.body.json();
        const estadoProyectoID = Number(body.estadoProyectoID);

        if (![1, 2, 3].includes(estadoProyectoID)) {
            response.status = 400;
            response.body = { success: false, message: "estadoProyectoID invalido (1 Planificado, 2 En construccion, 3 Finalizado)" };
            return;
        }

        await proyecto.CambiarEstado(estadoProyectoID);
        response.status = 200;
        response.body = { success: true, message: "Estado del proyecto actualizado" };
    } catch (error) {
        console.error("ERROR AL CAMBIAR ESTADO:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al cambiar el estado del proyecto" };
    }
};

export const deleteProyecto = async (ctx: RouterContext<"/panel/constructora/proyectos/:id">) => {
    const { response, params, state } = ctx as typeof ctx & { state: { constructoraID: number } };
    try {
        const id = Number(params.id);
        const proyecto = new Proyecto(null, id);
        if (!(await proyecto.PerteneceAConstructora(state.constructoraID))) {
            response.status = 404;
            response.body = { success: false, message: "Proyecto no encontrado" };
            return;
        }

        await proyecto.EliminarProyecto();
        response.status = 200;
        response.body = { success: true, message: "Proyecto eliminado correctamente" };
    } catch (error) {
        console.error("ERROR AL ELIMINAR PROYECTO:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al eliminar el proyecto" };
    }
};

export const postImagenProyecto = async (ctx: RouterContext<"/panel/constructora/proyectos/:id/imagenes">) => {
    const { response, params, request, state } = ctx as typeof ctx & { state: { constructoraID: number } };
    try {
        const id = Number(params.id);
        const proyecto = new Proyecto(null, id);
        if (!(await proyecto.PerteneceAConstructora(state.constructoraID))) {
            response.status = 404;
            response.body = { success: false, message: "Proyecto no encontrado" };
            return;
        }

        const form = await request.body.formData();
        const archivo = form.get("imagen");
        if (!(archivo instanceof File)) {
            response.status = 400;
            response.body = { success: false, message: "Debes enviar un archivo 'imagen'" };
            return;
        }

        const resultado = await guardarImagen(archivo, "proyectos");
        if (!resultado.ok) {
            response.status = 400;
            response.body = { success: false, message: resultado.error };
            return;
        }

        const imagenID = await proyecto.InsertarImagen(resultado.url!);
        response.status = 201;
        response.body = { success: true, message: "Imagen agregada", data: { imagenID, url: resultado.url } };
    } catch (error) {
        console.error("ERROR AL SUBIR IMAGEN:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al subir la imagen" };
    }
};

export const deleteImagenProyecto = async (
    ctx: RouterContext<"/panel/constructora/proyectos/:id/imagenes/:imagenId">,
) => {
    const { response, params, state } = ctx as typeof ctx & { state: { constructoraID: number } };
    try {
        const id = Number(params.id);
        const imagenId = Number(params.imagenId);

        const proyecto = new Proyecto(null, id);
        if (!(await proyecto.PerteneceAConstructora(state.constructoraID))) {
            response.status = 404;
            response.body = { success: false, message: "Proyecto no encontrado" };
            return;
        }

        const urlEliminada = await proyecto.EliminarImagen(imagenId);
        if (!urlEliminada) {
            response.status = 404;
            response.body = { success: false, message: "Imagen no encontrada" };
            return;
        }

        await eliminarImagenDisco(urlEliminada);
        response.status = 200;
        response.body = { success: true, message: "Imagen eliminada correctamente" };
    } catch (error) {
        console.error("ERROR AL ELIMINAR IMAGEN:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al eliminar la imagen" };
    }
};

export const postAvanceProyecto = async (ctx: RouterContext<"/panel/constructora/proyectos/:id/avances">) => {
    const { response, params, request, state } = ctx as typeof ctx & {
        state: { constructoraID: number; user: { sub: string } };
    };
    try {
        const id = Number(params.id);
        const proyecto = new Proyecto(null, id);
        if (!(await proyecto.PerteneceAConstructora(state.constructoraID))) {
            response.status = 404;
            response.body = { success: false, message: "Proyecto no encontrado" };
            return;
        }

        const body = await request.body.json();
        const porcentaje = Number(body.porcentaje);
        const nota = body.nota ?? null;

        if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
            response.status = 400;
            response.body = { success: false, message: "El porcentaje debe estar entre 0 y 100" };
            return;
        }

        const usuarioID = Number(state.user.sub);
        const avanceID = await proyecto.RegistrarAvance(usuarioID, porcentaje, nota);

        response.status = 201;
        response.body = { success: true, message: "Avance registrado correctamente", data: { avanceID } };
    } catch (error) {
        console.error("ERROR AL REGISTRAR AVANCE:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al registrar el avance" };
    }
};

export const getAvancesProyecto = async (ctx: RouterContext<"/panel/constructora/proyectos/:id/avances">) => {
    const { response, params, state } = ctx as typeof ctx & { state: { constructoraID: number } };
    try {
        const id = Number(params.id);
        const proyecto = new Proyecto(null, id);
        if (!(await proyecto.PerteneceAConstructora(state.constructoraID))) {
            response.status = 404;
            response.body = { success: false, message: "Proyecto no encontrado" };
            return;
        }

        const data = await proyecto.ListarAvances();
        response.status = 200;
        response.body = { success: true, data };
    } catch (error) {
        console.error("ERROR AL LISTAR AVANCES:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al listar los avances" };
    }
};

export const getPropiedadesConstructora = async (ctx: Context) => {
    const { response, state } = ctx as CtxConstructora;
    try {
        const propiedad = new Propiedad();
        const data = await propiedad.SeleccionarPorConstructora(state.constructoraID);
        response.status = 200;
        response.body = { success: true, data };
    } catch (error) {
        console.error("ERROR AL LISTAR PROPIEDADES:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al listar las propiedades" };
    }
};

export const getPropiedadConstructoraPorId = async (ctx: RouterContext<"/panel/constructora/propiedades/:id">) => {
    const { response, params, state } = ctx as typeof ctx & { state: { constructoraID: number } };
    try {
        const id = Number(params.id);
        const propiedad = new Propiedad(null, id);

        if (!(await propiedad.PerteneceAConstructora(state.constructoraID))) {
            response.status = 404;
            response.body = { success: false, message: "Propiedad no encontrada" };
            return;
        }

        const data = await propiedad.ConsultarPropiedad();
        response.status = 200;
        response.body = { success: true, data };
    } catch (error) {
        console.error("ERROR AL CONSULTAR PROPIEDAD:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al consultar la propiedad" };
    }
};

export const postPropiedadConstructora = async (ctx: Context) => {
    const { response, request, state } = ctx as CtxConstructora;
    try {
        const body = await request.body.json();
        const { titulo, descripcion, precio, tipoOperacionID, habitaciones, direccion, ciudad, agenteID, estado, destacada } = body;

        if (!titulo || !precio || !tipoOperacionID || !direccion) {
            response.status = 400;
            response.body = { success: false, message: "Titulo, precio, tipoOperacionID y direccion son obligatorios" };
            return;
        }

        const propiedad = new Propiedad({
            titulo,
            descripcion: descripcion ?? null,
            precio: String(precio),
            tipoOperacionID: Number(tipoOperacionID),
            habitaciones: habitaciones ?? null,
            direccion,
            ciudad: ciudad ?? null,
            constructoraID: state.constructoraID, // siempre la propia, nunca la del body
            agenteID: agenteID ?? null,
            estado: estado ?? "Disponible",
            destacada: destacada ?? false,
        });

        const filasAfectadas = await propiedad.InsertarPropiedad();
        if (filasAfectadas > 0) {
            response.status = 201;
            response.body = { success: true, message: "Propiedad creada correctamente" };
        } else {
            response.status = 409;
            response.body = { success: false, message: "No se pudo crear la propiedad" };
        }
    } catch (error) {
        console.error("ERROR AL CREAR PROPIEDAD:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al crear la propiedad" };
    }
};

export const putPropiedadConstructora = async (ctx: RouterContext<"/panel/constructora/propiedades/:id">) => {
    const { response, params, request, state } = ctx as typeof ctx & { state: { constructoraID: number } };
    try {
        const id = Number(params.id);
        const check = new Propiedad(null, id);
        if (!(await check.PerteneceAConstructora(state.constructoraID))) {
            response.status = 404;
            response.body = { success: false, message: "Propiedad no encontrada" };
            return;
        }

        const body = await request.body.json();
        const { titulo, descripcion, precio, tipoOperacionID, habitaciones, direccion, ciudad, agenteID, estado, destacada } = body;

        if (!titulo || !precio || !tipoOperacionID || !direccion) {
            response.status = 400;
            response.body = { success: false, message: "Titulo, precio, tipoOperacionID y direccion son obligatorios" };
            return;
        }

        const propiedad = new Propiedad({
            titulo,
            descripcion: descripcion ?? null,
            precio: String(precio),
            tipoOperacionID: Number(tipoOperacionID),
            habitaciones: habitaciones ?? null,
            direccion,
            ciudad: ciudad ?? null,
            constructoraID: state.constructoraID,
            agenteID: agenteID ?? null,
            estado: estado ?? "Disponible",
            destacada: destacada ?? false,
        }, id);

        await propiedad.ActualizarPropiedad();
        response.status = 200;
        response.body = { success: true, message: "Propiedad actualizada correctamente" };
    } catch (error) {
        console.error("ERROR AL ACTUALIZAR PROPIEDAD:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al actualizar la propiedad" };
    }
};

export const deletePropiedadConstructora = async (ctx: RouterContext<"/panel/constructora/propiedades/:id">) => {
    const { response, params, state } = ctx as typeof ctx & { state: { constructoraID: number } };
    try {
        const id = Number(params.id);
        const propiedad = new Propiedad(null, id);
        if (!(await propiedad.PerteneceAConstructora(state.constructoraID))) {
            response.status = 404;
            response.body = { success: false, message: "Propiedad no encontrada" };
            return;
        }

        await propiedad.EliminarPropiedad();
        response.status = 200;
        response.body = { success: true, message: "Propiedad eliminada correctamente" };
    } catch (error) {
        console.error("ERROR AL ELIMINAR PROPIEDAD:", error);
        response.status = 500;
        response.body = { success: false, message: "Error al eliminar la propiedad" };
    }
};

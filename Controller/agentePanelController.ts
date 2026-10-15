/**
 * agentePanelController.ts
 * Controladores del panel del agente — sección Propiedades.
 *
 * Cada handler solo puede ver/modificar las propiedades donde
 * propiedades.AgenteID = agenteID del token (inyectado por
 * agenteScopeMiddleware).
 */
import type { Context } from "../Dependencies/dependencias.ts";
import { Propiedad } from "../Model/propiedadesModel.ts";
import { guardarImagen, eliminarImagenDisco } from "../Helpers/upload.ts";
import { Proyecto } from "../Model/proyectosModel.ts";
import { db } from "../Model/conexion.ts";
import { date, eq } from "../Dependencies/dependencias.ts";
import { usuarios } from "../Model/schema.ts";

function paramsDe(ctx: Context): { id?: string; imgId?: string } {
  return (ctx as unknown as { params?: { id?: string; imgId?: string } }).params ?? {};
}

function getAgenteID(ctx: Context): number {
  return Number((ctx.state as { agenteID?: number }).agenteID);
}

function parsePropiedadID(raw: string | undefined): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function propiedadPerteneceAlAgente(
  propiedadID: number,
  agenteID: number,
): Promise<boolean> {
  return await new Propiedad(null, propiedadID).PerteneceAAgente(agenteID);
}

const ESTADOS_VALIDOS = [
  "Disponible",
  "Reservada",
  "En mantenimiento",
  "Fuera del mercado",
] as const;

type EstadoPropiedad = (typeof ESTADOS_VALIDOS)[number];

function esEstadoPropiedad(valor: string): valor is EstadoPropiedad {
  return (ESTADOS_VALIDOS as readonly string[]).includes(valor);
}

export const listarMisPropiedades = async (ctx: Context): Promise<void> => {
  try {
    const agenteID = getAgenteID(ctx);
    const propiedades = await new Propiedad().SeleccionarPorAgente(agenteID);

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      total: propiedades.length,
      data: propiedades,
    };
  } catch (error) {
    console.error("[agente:listarMisPropiedades]", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, error: "Error al listar tus propiedades" };
  }
};

export const verDetallePropiedad = async (ctx: Context): Promise<void> => {
  try {
    const agenteID = getAgenteID(ctx);
    const propiedadID = parsePropiedadID(paramsDe(ctx).id);

    if (propiedadID === null) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "ID de propiedad inválido" };
      return;
    }

    const esPropietario = await propiedadPerteneceAlAgente(propiedadID, agenteID);

    if (!esPropietario) {
      const existe = await new Propiedad(null, propiedadID).ConsultarPropiedad(false);
      if (!existe) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, error: "Propiedad no encontrada" };
      } else {
        ctx.response.status = 403;
        ctx.response.body = { success: false, error: "No tienes permisos sobre esta propiedad" };
      }
      return;
    }

    const propiedad = await new Propiedad(null, propiedadID).ConsultarPropiedad(false);

    ctx.response.status = 200;
    ctx.response.body = { success: true, data: propiedad };
  } catch (error) {
    console.error("[agente:verDetallePropiedad]", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, error: "Error al consultar la propiedad" };
  }
};

export const crearMiPropiedad = async (ctx: Context): Promise<void> => {
  try {
    const agenteID = getAgenteID(ctx);
    const body = await ctx.request.body.json();

    const { titulo, precio, tipoOperacionID, direccion } = body;

    if (!titulo || typeof titulo !== "string" || titulo.trim() === "") {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "El campo 'titulo' es obligatorio" };
      return;
    }
    if (!precio || isNaN(Number(precio)) || Number(precio) <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "El campo 'precio' debe ser un número positivo" };
      return;
    }
    if (!tipoOperacionID || !Number.isInteger(Number(tipoOperacionID))) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "El campo 'tipoOperacionID' es obligatorio" };
      return;
    }
    if (!direccion || typeof direccion !== "string" || direccion.trim() === "") {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "El campo 'direccion' es obligatorio" };
      return;
    }

    const estadoRecibido = typeof body.estado === "string" ? body.estado : undefined;
    if (estadoRecibido && !esEstadoPropiedad(estadoRecibido)) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}`,
      };
      return;
    }

    const nuevaPropiedad = new Propiedad({
      titulo: titulo.trim(),
      descripcion: body.descripcion ?? null,
      precio: String(Number(precio)),
      tipoOperacionID: Number(tipoOperacionID),
      habitaciones: body.habitaciones ? Number(body.habitaciones) : null,
      direccion: direccion.trim(),
      ciudad: body.ciudad ?? null,
      constructoraID: body.constructoraID ? Number(body.constructoraID) : null,
      agenteID: agenteID,
      estado: estadoRecibido ?? "Disponible",
      destacada: body.destacada === true,
      inmobiliariaID: null,
    });

    const filasAfectadas = await nuevaPropiedad.InsertarPropiedad();

    if (filasAfectadas > 0) {
      ctx.response.status = 201;
      ctx.response.body = {
        success: true,
        message: "Propiedad publicada correctamente",
      };
    } else {
      ctx.response.status = 409;
      ctx.response.body = { success: false, error: "No se pudo crear la propiedad" };
    }
  } catch (error) {
    console.error("[agente:crearMiPropiedad]", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, error: "Error interno al crear la propiedad" };
  }
};

export const editarMiPropiedad = async (ctx: Context): Promise<void> => {
  try {
    const agenteID = getAgenteID(ctx);
    const propiedadID = parsePropiedadID(paramsDe(ctx).id);

    if (propiedadID === null) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "ID de propiedad inválido" };
      return;
    }

    const esPropietario = await propiedadPerteneceAlAgente(propiedadID, agenteID);
    if (!esPropietario) {
      const existe = await new Propiedad(null, propiedadID).ConsultarPropiedad(false);
      if (!existe) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, error: "Propiedad no encontrada" };
      } else {
        ctx.response.status = 403;
        ctx.response.body = { success: false, error: "No tienes permisos sobre esta propiedad" };
      }
      return;
    }

    const body = await ctx.request.body.json();
    const { titulo, precio, tipoOperacionID, direccion } = body;

    if (!titulo || typeof titulo !== "string" || titulo.trim() === "") {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "El campo 'titulo' es obligatorio" };
      return;
    }
    if (!precio || isNaN(Number(precio)) || Number(precio) <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "El campo 'precio' debe ser un número positivo" };
      return;
    }
    if (!tipoOperacionID || !Number.isInteger(Number(tipoOperacionID))) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "El campo 'tipoOperacionID' es obligatorio" };
      return;
    }
    if (!direccion || typeof direccion !== "string" || direccion.trim() === "") {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "El campo 'direccion' es obligatorio" };
      return;
    }

    const estadoRecibido = typeof body.estado === "string" ? body.estado : undefined;
    if (estadoRecibido && !esEstadoPropiedad(estadoRecibido)) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}`,
      };
      return;
    }

    const propiedadEditada = new Propiedad(
      {
        titulo: titulo.trim(),
        descripcion: body.descripcion ?? null,
        precio: String(Number(precio)),
        tipoOperacionID: Number(tipoOperacionID),
        habitaciones: body.habitaciones ? Number(body.habitaciones) : null,
        direccion: direccion.trim(),
        ciudad: body.ciudad ?? null,
        constructoraID: body.constructoraID ? Number(body.constructoraID) : null,
        agenteID: agenteID,
        estado: estadoRecibido ?? "Disponible",
        destacada: body.destacada === true,
        inmobiliariaID: null,
      },
      propiedadID,
    );

    const filasAfectadas = await propiedadEditada.ActualizarPropiedad();

    if (filasAfectadas > 0) {
      ctx.response.status = 200;
      ctx.response.body = { success: true, message: "Propiedad actualizada correctamente" };
    } else {
      ctx.response.status = 404;
      ctx.response.body = { success: false, error: "Propiedad no encontrada o sin cambios" };
    }
  } catch (error) {
    console.error("[agente:editarMiPropiedad]", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, error: "Error al editar la propiedad" };
  }
};

export const eliminarMiPropiedad = async (ctx: Context): Promise<void> => {
  try {
    const agenteID = getAgenteID(ctx);
    const propiedadID = parsePropiedadID(paramsDe(ctx).id);

    if (propiedadID === null) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "ID de propiedad inválido" };
      return;
    }

    const esPropietario = await propiedadPerteneceAlAgente(propiedadID, agenteID);
    if (!esPropietario) {
      const existe = await new Propiedad(null, propiedadID).ConsultarPropiedad(false);
      if (!existe) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, error: "Propiedad no encontrada" };
      } else {
        ctx.response.status = 403;
        ctx.response.body = { success: false, error: "No tienes permisos sobre esta propiedad" };
      }
      return;
    }

    const filasAfectadas = await new Propiedad(null, propiedadID).EliminarPropiedad();

    if (filasAfectadas > 0) {
      ctx.response.status = 200;
      ctx.response.body = { success: true, message: "Propiedad eliminada correctamente" };
    } else {
      ctx.response.status = 404;
      ctx.response.body = { success: false, error: "Propiedad no encontrada" };
    }
  } catch (error) {
    console.error("[agente:eliminarMiPropiedad]", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, error: "Error al eliminar la propiedad" };
  }
};

export const subirImagenMiPropiedad = async (ctx: Context): Promise<void> => {
  let urlGuardada: string | undefined;
  try {
    const agenteID = getAgenteID(ctx);
    const propiedadID = parsePropiedadID(paramsDe(ctx).id);

    if (propiedadID === null) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "ID de propiedad inválido" };
      return;
    }

    const esPropietario = await propiedadPerteneceAlAgente(propiedadID, agenteID);
    if (!esPropietario) {
      ctx.response.status = 403;
      ctx.response.body = { success: false, error: "No tienes permisos sobre esta propiedad" };
      return;
    }

    const form = await ctx.request.body.formData();
    const archivo = form.get("imagen");

    if (!(archivo instanceof File)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "Debes enviar un archivo con el campo 'imagen'" };
      return;
    }

    const resultado = await guardarImagen(archivo, "propiedades");

    if (!resultado.url) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: resultado.error ?? "No se pudo guardar la imagen" };
      return;
    }

    urlGuardada = resultado.url;
    const imagenID = await new Propiedad(null, propiedadID).InsertarImagen(resultado.url);

    ctx.response.status = 201;
    ctx.response.body = {
      success: true,
      message: "Imagen agregada correctamente",
      data: { imagenID, url: resultado.url },
    };
  } catch (error) {
    console.error("[agente:subirImagenMiPropiedad]", error);
    if (urlGuardada) await eliminarImagenDisco(urlGuardada);
    ctx.response.status = 500;
    ctx.response.body = { success: false, error: "Error al subir la imagen" };
  }
};

export const eliminarImagenMiPropiedad = async (ctx: Context): Promise<void> => {
  try {
    const agenteID = getAgenteID(ctx);
    const { id, imgId } = paramsDe(ctx);
    const propiedadID = parsePropiedadID(id);
    const imagenID = Number(imgId);

    if (propiedadID === null || !Number.isInteger(imagenID) || imagenID <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "IDs inválidos" };
      return;
    }

    const esPropietario = await propiedadPerteneceAlAgente(propiedadID, agenteID);
    if (!esPropietario) {
      ctx.response.status = 403;
      ctx.response.body = { success: false, error: "No tienes permisos sobre esta propiedad" };
      return;
    }

    const url = await new Propiedad(null, propiedadID).EliminarImagen(imagenID);

    if (url === null) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, error: "Imagen no encontrada en esta propiedad" };
      return;
    }

    await eliminarImagenDisco(url);

    ctx.response.status = 200;
    ctx.response.body = { success: true, message: "Imagen eliminada correctamente" };
  } catch (error) {
    console.error("[agente:eliminarImagenMiPropiedad]", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, error: "Error al eliminar la imagen" };
  }
};


export const listarMisProyectos = async (ctx:Context): Promise<void> => {
  try {
    const agenteID = getAgenteID(ctx);
    const usuario = await db
    .select({ inmobiliariaID: usuarios.inmobiliariaID })
    .from(usuarios)
    .where(eq(usuarios.usuarioID, agenteID))
    .limit(1);

    const inmobiliariaID = usuario[0]?.inmobiliariaID;
    if (!inmobiliariaID) {
      ctx.response.status = 403;
      ctx.response.body = { success: false, error: "No tienes una inmobiliaria asociada" };
      return;
    }

    const params = ctx.request.url.searchParams;
    const proyecto = new Proyecto();
    const data = await proyecto.SeleccionarPorInmobiliaria(inmobiliariaID, {
      estadoProyectoID: params.get("estadoProyectoID") ? Number (params.get("estadoProyectoID")) : undefined,
      orden: (params.get("orden") as "avance_asc" | "avance_desc" | "fecha") ?? undefined,
    });
    ctx.response.status = 200;
    ctx.response.body = { success: true, total: data.length, data}
  } catch (error) {
    console.error("[agente:listarMisProyectos", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, error: "Error al listar los proyectos" };
  }
};

export const verDetalleProyecto = async (ctx:Context): Promise<void> => {
  try {
    const agenteID = getAgenteID(ctx);
    const id = Number(paramsDe(ctx).id);
    if (!id) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "ID invalido" }; 
      return;
    }

    const usuario = await db.select({ inmobiliariaID: usuarios.inmobiliariaID}).from(usuarios)
    .where(eq(usuarios.usuarioID, agenteID)).limit(1);
    const inmobiliariaID = usuario[0]?.inmobiliariaID;
    if (!inmobiliariaID) {
      ctx.response.status = 403;
      ctx.response.body = { success: false, error: "Sin inmobiliaria asociada" };
       return;
    }
    
    const proyecto = new Proyecto(null, id);
    if (!(await proyecto.PerteneceAInmobiliaria(inmobiliariaID))) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, error: "Proyecto no encontrado" };
      return;
    }

    const data = await proyecto.ConsultarProyecto();
    ctx.response.status = 200;
    ctx.response.body = { success: true, data };
  } catch (error) {
    console.error("[agente:verDetalleProyecto", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, error: "Error al consultar el proyecto" };
  }
};

export const editarMiProyecto = async (ctx: Context): Promise<void> => {
    try {
        const agenteID = getAgenteID(ctx);
        const id = Number(paramsDe(ctx).id);
        if (!id) { 
          ctx.response.status = 400; 
          ctx.response.body = { success: false, error: "ID inválido" }; return; }

        const usuario = await db.select({ inmobiliariaID: usuarios.inmobiliariaID }).from(usuarios).where(eq(usuarios.usuarioID, agenteID)).limit(1);
        const inmobiliariaID = usuario[0]?.inmobiliariaID;
        if (!inmobiliariaID) {
          ctx.response.status = 403; 
          ctx.response.body = { success: false, error: "Sin inmobiliaria asociada" }; return; }

        const proyecto = new Proyecto(null, id);
        if (!(await proyecto.PerteneceAInmobiliaria(inmobiliariaID))) {
            ctx.response.status = 404;
            ctx.response.body = { success: false, error: "Proyecto no encontrado" };
            return;
        }

        const body = await ctx.request.body.json();
        const { nombre, estadoProyectoID, porcentajeAvance, fechaInicio, fechaFin, descripcion, ubicacion } = body;

        if (!nombre?.trim() || !estadoProyectoID) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, error: "Nombre y estadoProyectoID son obligatorios" };
            return;
        }
        if (![1, 2, 3].includes(Number(estadoProyectoID))) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, error: "estadoProyectoID inválido (1=Planificado, 2=En construcción, 3=Finalizado)" };
            return;
        }
        const pct = Number(porcentajeAvance ?? 0);
        if (isNaN(pct) || pct < 0 || pct > 100) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, error: "El porcentaje debe estar entre 0 y 100" };
            return;
        }
        if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, error: "La fecha de inicio no puede ser posterior a la fecha de fin" };
            return;
        }

        const proyectoEdit = new Proyecto({
            nombre: nombre.trim(),
            estadoProyectoID: Number(estadoProyectoID),
            porcentajeAvance: String(pct),
            fechaInicio: fechaInicio ?? null,
            fechaFin: fechaFin ?? null,
            descripcion: descripcion ?? null,
            ubicacion: ubicacion ?? null,
            inmobiliariaID: inmobiliariaID,
        }, id);

        await proyectoEdit.ActualizarProyecto();

        ctx.response.status = 200;
        ctx.response.body = { success: true, message: "Proyecto actualizado correctamente" };
    } catch (error) {
        console.error("[agente:editarMiProyecto]", error);
        ctx.response.status = 500;
        ctx.response.body = { success: false, error: "Error al actualizar el proyecto" };
    }
};

export const subirImagenMiProyecto = async (ctx: Context): Promise<void> => {
    let urlGuardada: string | undefined;
    try {
        const agenteID = getAgenteID(ctx);
        const id = Number(paramsDe(ctx).id);
        if (!id) { ctx.response.status = 400; ctx.response.body = { success: false, error: "ID inválido" }; return; }

        const usuario = await db.select({ inmobiliariaID: usuarios.inmobiliariaID }).from(usuarios).where(eq(usuarios.usuarioID, agenteID)).limit(1);
        const inmobiliariaID = usuario[0]?.inmobiliariaID;
        if (!inmobiliariaID) { ctx.response.status = 403; ctx.response.body = { success: false, error: "Sin inmobiliaria asociada" }; return; }

        const proyecto = new Proyecto(null, id);
        if (!(await proyecto.PerteneceAInmobiliaria(inmobiliariaID))) {
            ctx.response.status = 404;
            ctx.response.body = { success: false, error: "Proyecto no encontrado" };
            return;
        }
        const form = await ctx.request.body.formData();
        const archivo = form.get("imagen");
        if (!(archivo instanceof File)) { 
          ctx.response.status = 400; 
          ctx.response.body = { success: false, error: "Debes enviar un archivo 'imagen'" };
           return; 
          }
        if (!archivo.type.startsWith("image/")) {
           ctx.response.status = 400; 
           ctx.response.body = { success: false, error: "El archivo debe ser una imagen válida" }; 
           return; 
          }

        const resultado = await guardarImagen(archivo, "proyectos");
        if (!resultado.ok || !resultado.url) { ctx.response.status = 400; ctx.response.body = { success: false, error: resultado.error }; return; }

        urlGuardada = resultado.url;
        const imagenID = await proyecto.InsertarImagen(resultado.url);
        ctx.response.status = 201;
        ctx.response.body = { success: true, message: "Imagen agregada", data: { imagenID, url: resultado.url } };
    } catch (error) {
        console.error("[agente:subirImagenMiProyecto]", error);
        if (urlGuardada) await eliminarImagenDisco(urlGuardada);
        ctx.response.status = 500;
        ctx.response.body = { success: false, error: "Error al subir la imagen" };
    }
};

export const eliminarImagenMiProyecto = async (ctx: Context): Promise<void> => {
    try {
        const agenteID = getAgenteID(ctx);
        const id = Number(paramsDe(ctx).id);
        const imagenID = Number((paramsDe(ctx) as any).imagenId);
        if (!id || !imagenID) { 
          ctx.response.status = 400;
          ctx.response.body = { success: false, error: "IDs inválidos" };
           return; 
          }

        const usuario = await db.select({ inmobiliariaID: usuarios.inmobiliariaID }).from(usuarios).
        where(eq(usuarios.usuarioID, agenteID)).limit(1);
        const inmobiliariaID = usuario[0]?.inmobiliariaID;
        if (!inmobiliariaID) {
           ctx.response.status = 403;
            ctx.response.body = { success: false, error: "Sin inmobiliaria asociada" }; 
            return; 
          }

        const proyecto = new Proyecto(null, id);
        if (!(await proyecto.PerteneceAInmobiliaria(inmobiliariaID))) {
            ctx.response.status = 404;
            ctx.response.body = { success: false, error: "Proyecto no encontrado" };
            return;
        }

        const url = await proyecto.EliminarImagen(imagenID);
        if (!url) { 
          ctx.response.status = 404; 
          ctx.response.body = { success: false, error: "Imagen no encontrada" }; 
          return; 
        }

        await eliminarImagenDisco(url);
        ctx.response.status = 200;
        ctx.response.body = { success: true, message: "Imagen eliminada correctamente" };
    } catch (error) {
        console.error("[agente:eliminarImagenMiProyecto]", error);
        ctx.response.status = 500;
        ctx.response.body = { success: false, error: "Error al eliminar la imagen" };
    }
};
import { bcrypt } from "../Dependencies/dependencias.ts";
import {
  actualizarFotoPerfil,
  actualizarPerfil,
  buscarPorId,
  obtenerPerfilAgente,
} from "../Model/usuarioModel.ts";
import type { Context } from "../Dependencies/dependencias.ts";
import { Propiedad } from "../Model/propiedadesModel.ts";
import { eliminarImagenDisco, guardarImagen } from "../Helpers/upload.ts";
import { Proyecto } from "../Model/proyectosModel.ts";
import { db } from "../Model/conexion.ts";
import { eq } from "../Dependencies/dependencias.ts";
import { usuarios } from "../Model/schema.ts";

function paramsDe(ctx: Context): { id?: string; imgId?: string } {
  return (ctx as unknown as { params?: { id?: string; imgId?: string } })
    .params ?? {};
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
    const inmobiliariaID = (ctx.state as { inmobiliariaID?: number | null })
    .inmobiliariaID;
     if (!inmobiliariaID) {
      ctx.response.status = 200;
      ctx.response.body = { success: true, total: 0, data: [] };
      return;
    }

    const propiedades = await new Propiedad().SeleccionarPorAgenteEnInmobiliaria(
      agenteID,
      inmobiliariaID,
    );

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      total: propiedades.length,
      data: propiedades,
    };
  } catch (error) {
    console.error("[agente:listarMisPropiedades]", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Error al listar tus propiedades",
    };
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

    const esPropietario = await propiedadPerteneceAlAgente(
      propiedadID,
      agenteID,
    );

    if (!esPropietario) {
      const existe = await new Propiedad(null, propiedadID).ConsultarPropiedad(
        false,
      );
      if (!existe) {
        ctx.response.status = 404;
        ctx.response.body = {
          success: false,
          error: "Propiedad no encontrada",
        };
      } else {
        ctx.response.status = 403;
        ctx.response.body = {
          success: false,
          error: "No tienes permisos sobre esta propiedad",
        };
      }
      return;
    }

    const propiedad = await new Propiedad(null, propiedadID).ConsultarPropiedad(
      false,
    );

    ctx.response.status = 200;
    ctx.response.body = { success: true, data: propiedad };
  } catch (error) {
    console.error("[agente:verDetallePropiedad]", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Error al consultar la propiedad",
    };
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

    const esPropietario = await propiedadPerteneceAlAgente(
      propiedadID,
      agenteID,
    );
    if (!esPropietario) {
      const existe = await new Propiedad(null, propiedadID).ConsultarPropiedad(
        false,
      );
      if (!existe) {
        ctx.response.status = 404;
        ctx.response.body = {
          success: false,
          error: "Propiedad no encontrada",
        };
      } else {
        ctx.response.status = 403;
        ctx.response.body = {
          success: false,
          error: "No tienes permisos sobre esta propiedad",
        };
      }
      return;
    }

    const body = await ctx.request.body.json();
    const cambios: {
      titulo?: string;
      descripcion?: string | null;
      habitaciones?: number | null;
      estado?: EstadoPropiedad;
    } = {};

    if (body.titulo !== undefined) {
      if (
        typeof body.titulo !== "string" || body.titulo.trim() === "" ||
        body.titulo.trim().length > 150
      ) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "El 'titulo' debe tener entre 1 y 150 caracteres",
        };
        return;
      }
      cambios.titulo = body.titulo.trim();
    }

    if (body.descripcion !== undefined) {
      if (body.descripcion !== null && typeof body.descripcion !== "string") {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "La 'descripcion' debe ser texto",
        };
        return;
      }
      cambios.descripcion =
        body.descripcion === null || body.descripcion.trim() === ""
          ? null
          : body.descripcion.trim();
    }

    if (body.habitaciones !== undefined) {
      if (body.habitaciones === null || body.habitaciones === "") {
        cambios.habitaciones = null;
      } else {
        const hab = Number(body.habitaciones);
        if (!Number.isInteger(hab) || hab < 0) {
          ctx.response.status = 400;
          ctx.response.body = {
            success: false,
            error: "Las 'habitaciones' deben ser un entero mayor o igual a 0",
          };
          return;
        }
        cambios.habitaciones = hab;
      }
    }

    if (body.estado !== undefined) {
      if (typeof body.estado !== "string" || !esEstadoPropiedad(body.estado)) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: `Estado inválido. Valores permitidos: ${
            ESTADOS_VALIDOS.join(", ")
          }`,
        };
        return;
      }
      cambios.estado = body.estado;
    }

    if (Object.keys(cambios).length === 0) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error:
          "No enviaste ningún campo editable (titulo, descripcion, habitaciones, estado)",
      };
      return;
    }

    const filasAfectadas = await new Propiedad(null, propiedadID)
      .ActualizarDatosNoSensibles(cambios);

    if (filasAfectadas > 0) {
      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        message: "Propiedad actualizada correctamente",
      };
    } else {
      ctx.response.status = 404;
      ctx.response.body = { success: false, error: "Propiedad no encontrada" };
    }
  } catch (error) {
    console.error("[agente:editarMiPropiedad]", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Error al editar la propiedad",
    };
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

    const esPropietario = await propiedadPerteneceAlAgente(
      propiedadID,
      agenteID,
    );
    if (!esPropietario) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "No tienes permisos sobre esta propiedad",
      };
      return;
    }

    const form = await ctx.request.body.formData();
    const archivo = form.get("imagen");

    if (!(archivo instanceof File)) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "Debes enviar un archivo con el campo 'imagen'",
      };
      return;
    }

    const resultado = await guardarImagen(archivo, "propiedades");

    if (!resultado.url) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: resultado.error ?? "No se pudo guardar la imagen",
      };
      return;
    }

    urlGuardada = resultado.url;
    const imagenID = await new Propiedad(null, propiedadID).InsertarImagen(
      resultado.url,
    );

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

export const eliminarImagenMiPropiedad = async (
  ctx: Context,
): Promise<void> => {
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

    const esPropietario = await propiedadPerteneceAlAgente(
      propiedadID,
      agenteID,
    );
    if (!esPropietario) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "No tienes permisos sobre esta propiedad",
      };
      return;
    }

    const url = await new Propiedad(null, propiedadID).EliminarImagen(imagenID);

    if (url === null) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: "Imagen no encontrada en esta propiedad",
      };
      return;
    }

    await eliminarImagenDisco(url);

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Imagen eliminada correctamente",
    };
  } catch (error) {
    console.error("[agente:eliminarImagenMiPropiedad]", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Error al eliminar la imagen",
    };
  }
};

export const listarMisProyectos = async (ctx: Context): Promise<void> => {
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
      ctx.response.body = {
        success: false,
        error: "No tienes una inmobiliaria asociada",
      };
      return;
    }

    const params = ctx.request.url.searchParams;
    const proyecto = new Proyecto();
    const data = await proyecto.SeleccionarPorInmobiliaria(inmobiliariaID, {
      estadoProyectoID: params.get("estadoProyectoID")
        ? Number(params.get("estadoProyectoID"))
        : undefined,
      orden: (params.get("orden") as "avance_asc" | "avance_desc" | "fecha") ??
        undefined,
    });
    ctx.response.status = 200;
    ctx.response.body = { success: true, total: data.length, data };
  } catch (error) {
    console.error("[agente:listarMisProyectos", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Error al listar los proyectos",
    };
  }
};

export const verDetalleProyecto = async (ctx: Context): Promise<void> => {
  try {
    const agenteID = getAgenteID(ctx);
    const id = Number(paramsDe(ctx).id);
    if (!id) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "ID invalido" };
      return;
    }

    const usuario = await db.select({ inmobiliariaID: usuarios.inmobiliariaID })
      .from(usuarios)
      .where(eq(usuarios.usuarioID, agenteID)).limit(1);
    const inmobiliariaID = usuario[0]?.inmobiliariaID;
    if (!inmobiliariaID) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "Sin inmobiliaria asociada",
      };
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
    ctx.response.body = {
      success: false,
      error: "Error al consultar el proyecto",
    };
  }
};

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const verMiPerfil = async (ctx: Context): Promise<void> => {
  try {
    const agenteID = getAgenteID(ctx);
    const perfil = await obtenerPerfilAgente(agenteID);

    if (!perfil) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, error: "Usuario no encontrado" };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = { success: true, data: perfil };
  } catch (error) {
    console.error("[agente:verMiPerfil]", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, error: "Error interno del servidor" };
  }
};

export const actualizarMiPerfil = async (ctx: Context): Promise<void> => {
  try {
    const agenteID = getAgenteID(ctx);

    let body: Record<string, unknown>;
    try {
      body = await ctx.request.body.json();
    } catch {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "Cuerpo JSON inválido" };
      return;
    }

    const nombre = typeof body.Nombre === "string" ? body.Nombre.trim() : "";
    if (!nombre) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "El nombre es obligatorio" };
      return;
    }
    if (nombre.length > 100) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "El nombre no puede superar 100 caracteres",
      };
      return;
    }

    const telefonoRaw = typeof body.Telefono === "string"
      ? body.Telefono.trim()
      : "";
    if (telefonoRaw.length > 20) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "El teléfono no puede superar 20 caracteres",
      };
      return;
    }
    const telefono = telefonoRaw === "" ? null : telefonoRaw;

    let contrasenaHash: string | undefined;
    const passwordNuevo = body.PasswordNuevo;

    if (
      passwordNuevo !== undefined && passwordNuevo !== null &&
      passwordNuevo !== ""
    ) {
      const passwordActual = body.PasswordActual;
      if (typeof passwordActual !== "string" || passwordActual.length === 0) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Debes proporcionar tu contraseña actual",
        };
        return;
      }
      if (
        typeof passwordNuevo !== "string" || !PASSWORD_REGEX.test(passwordNuevo)
      ) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error:
            "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial",
        };
        return;
      }

      const usuario = await buscarPorId(agenteID);
      if (!usuario) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, error: "Usuario no encontrado" };
        return;
      }
      if (!usuario.contrasenaHash) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Tu cuenta no tiene contraseña local",
        };
        return;
      }

      const coincide = await bcrypt.compare(
        passwordActual,
        usuario.contrasenaHash,
      );
      if (!coincide) {
        ctx.response.status = 401;
        ctx.response.body = {
          success: false,
          error: "La contraseña actual es incorrecta",
        };
        return;
      }

      contrasenaHash = await bcrypt.hash(passwordNuevo);
    }

    await actualizarPerfil(agenteID, {
      nombre,
      telefono,
      ...(contrasenaHash ? { contrasenaHash } : {}),
    });

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Perfil actualizado correctamente",
    };
  } catch (error) {
    console.error("[agente:actualizarMiPerfil]", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, error: "Error interno del servidor" };
  }
};

export const subirFotoMiPerfil = async (ctx: Context): Promise<void> => {
  let urlNueva: string | undefined;
  try {
    const agenteID = getAgenteID(ctx);
    const form = await ctx.request.body.formData();
    const archivo = form.get("foto");

    if (!(archivo instanceof File) || archivo.size === 0) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "Debes adjuntar una imagen en el campo 'foto'",
      };
      return;
    }

    const resultado = await guardarImagen(archivo, "perfiles");
    if (!resultado.ok || !resultado.url) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: resultado.error ?? "No se pudo guardar la imagen",
      };
      return;
    }

    urlNueva = resultado.url;
    const anterior = (await buscarPorId(agenteID))?.fotoPerfil ?? null;

    await actualizarFotoPerfil(agenteID, resultado.url);

    if (anterior && anterior !== resultado.url) {
      await eliminarImagenDisco(anterior);
    }

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Foto de perfil actualizada correctamente",
      data: { url: resultado.url },
    };
  } catch (error) {
    console.error("[agente:subirFotoMiPerfil]", error);
    if (urlNueva) await eliminarImagenDisco(urlNueva);
    ctx.response.status = 500;
    ctx.response.body = { success: false, error: "Error interno del servidor" };
  }
};

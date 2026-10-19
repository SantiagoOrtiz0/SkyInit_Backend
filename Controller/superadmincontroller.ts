import { Context } from "../Dependencies/dependencias.ts";
import { bcrypt } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import { inmobiliarias } from "../Model/schema.ts";
import { Constructora } from "../Model/constructoraModel.ts";
import {
  listarUsuariosAdmin,
  listarRoles,
  crearUsuarioAdmin,
  actualizarUsuarioAdmin,
  correoExiste,
  buscarPorId,
  actualizarPerfil,
  actualizarFotoPerfil,
  obtenerPerfilSuperAdmin,
} from "../Model/usuarioModel.ts";
import { guardarImagen, eliminarImagenDisco } from "../Helpers/upload.ts";


export const getUsuarios = async (ctx: Context) => {
    try {
        const data = await listarUsuariosAdmin();
        ctx.response.status = 200;
        ctx.response.body = { success: true, data };
    } catch (e) {
        console.error(e);
        ctx.response.status = 500;
        ctx.response.body = { success: false, message: "Error al listar usuarios" };
    }
};

export const getRoles = async (ctx: Context) => {
    try {
        const data = await listarRoles();
        ctx.response.status = 200;
        ctx.response.body = { success: true, data };
    } catch (e) {
        console.error(e);
        ctx.response.status = 500;
        ctx.response.body = { success: false, message: "Error al listar roles" };
    }
};

export const getInmobiliarias = async (ctx: Context) => {
    const data = await db
        .select({
        inmobiliariaID: inmobiliarias.inmobiliariaID,
        nombre: inmobiliarias.nombre,
        ciudad: inmobiliarias.ciudad,
        })
        .from(inmobiliarias);
    ctx.response.status = 200;
    ctx.response.body = { success: true, data };
    };

export const postUsuario = async (ctx: Context) => {
    try {
        const body = await ctx.request.body.json();
        const { nombre, correo, password, telefono, rolID, inmobiliariaID, estadoCuenta } = body;

        if (!nombre?.trim() || !correo?.trim() || !password || !rolID) {
        ctx.response.status = 400;
        ctx.response.body = {
            success: false,
            message: "nombre, correo, password y rolID son obligatorios",
        };
        return;
        }

        if (await correoExiste(correo.trim())) {
        ctx.response.status = 409;
        ctx.response.body = { success: false, message: "El correo ya está registrado" };
        return;
        }

        const hash = await bcrypt.hash(password);
        const id = await crearUsuarioAdmin({
        nombre: nombre.trim(),
        correo: correo.trim(),
        contrasenaHash: hash,
        telefono: telefono?.trim() || null,
        rolID: Number(rolID),
        inmobiliariaID: inmobiliariaID ? Number(inmobiliariaID) : null,
        estadoCuenta: estadoCuenta || "Activa",
        });

        ctx.response.status = 201;
        ctx.response.body = { success: true, message: "Usuario creado", id };
    } catch (e) {
        console.error(e);
        ctx.response.status = 500;
        ctx.response.body = { success: false, message: "Error al crear usuario" };
    }
};

export const putUsuario = async (ctx: Context) => {
    try {
        const id = Number((ctx as any).params?.id ?? ctx.request.url.searchParams.get("id"));
        if (!id || isNaN(id)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID inválido" };
        return;
        }

        const existe = await buscarPorId(id);
        if (!existe) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Usuario no encontrado" };
        return;
        }

        const body = await ctx.request.body.json();
        const data: any = {
        nombre: body.nombre?.trim(),
        telefono: body.telefono?.trim() || null,
        rolID: body.rolID != null ? Number(body.rolID) : undefined,
        inmobiliariaID:
            body.inmobiliariaID === "" || body.inmobiliariaID == null
            ? null
            : Number(body.inmobiliariaID),
        estadoCuenta: body.estadoCuenta,
        };

        if (body.password?.trim()) {
        data.contrasenaHash = await bcrypt.hash(body.password.trim());
        }

        await actualizarUsuarioAdmin(id, data);
        ctx.response.status = 200;
        ctx.response.body = { success: true, message: "Usuario actualizado" };
    } catch (e) {
        console.error(e);
        ctx.response.status = 500;
        ctx.response.body = { success: false, message: "Error al actualizar usuario" };
    }
};


export const getConstructorasSA = async (ctx: Context) => {
  try {
    const modelo = new Constructora();
    const data = await modelo.SeleccionarConstructoras();
    ctx.response.status = 200;
    ctx.response.body = { success: true, data };
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error al listar constructoras",
    };
  }
};

export const postConstructoraSA = async (ctx: Context) => {
  try {
    const body = await ctx.request.body.json();
    const {
      nombre,
      descripcion,
      contacto,
      telefono,
      correo,
      ciudad,
      estado,
      inmobiliariaIDs,
      usuario,
    } = body;

    if (!nombre?.trim() || !descripcion?.trim()) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "nombre y descripcion son obligatorios",
      };
      return;
    }

    let usuarioID: number | null = null;

    if (usuario?.accion === "crear") {
      if (!usuario.correo?.trim() || !usuario.password) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: "Para crear cuenta: correo y password",
        };
        return;
      }
      if (await correoExiste(usuario.correo.trim())) {
        ctx.response.status = 409;
        ctx.response.body = {
          success: false,
          message: "Ese correo de acceso ya está registrado",
        };
        return;
      }
      const hash = await bcrypt.hash(usuario.password);
      usuarioID = await crearUsuarioAdmin({
        nombre: (usuario.nombre || nombre).trim(),
        correo: usuario.correo.trim(),
        contrasenaHash: hash,
        telefono: telefono?.trim() || null,
        rolID: 5,
        estadoCuenta: "Activa",
      });
    }

    const modelo = new Constructora({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      contacto: contacto ?? null,
      telefono: telefono ?? null,
      correo: correo ?? null,
      ciudad: ciudad ?? null,
      estado: estado ?? "Pendiente",
      usuarioID: usuarioID ?? null,
    });

    const constructoraID = await modelo.CrearConstructora();

    if (Array.isArray(inmobiliariaIDs) && constructoraID) {
      const c = new Constructora(null, Number(constructoraID));
      for (const iid of inmobiliariaIDs) {
        if (iid) await c.VincularInmobiliaria(Number(iid));
      }
    }

    ctx.response.status = 201;
    ctx.response.body = {
      success: true,
      message: "Constructora creada",
      id: constructoraID,
    };
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error al crear constructora",
    };
  }
};

export const putConstructoraSA = async (ctx: Context) => {
  try {
    const id = Number(
      (ctx as any).params?.id ?? ctx.request.url.searchParams.get("id"),
    );
    if (!id || isNaN(id)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const body = await ctx.request.body.json();
    const {
      nombre,
      descripcion,
      contacto,
      telefono,
      correo,
      ciudad,
      estado,
      inmobiliariaIDs,
      usuario, // { accion: "crear"|"asignar"|"quitar", correo?, password?, nombre?, usuarioID? }
    } = body;

    const modelo = new Constructora(
      { nombre, descripcion, contacto, telefono, correo, ciudad, estado },
      id,
    );

    await modelo.ActualizarConstructora();

    if (Array.isArray(inmobiliariaIDs)) {
      const actuales = await modelo.ListarInmobiliariasVinculadas();
      for (const a of actuales) {
        await modelo.DesvincularInmobiliaria(a.inmobiliariaID);
      }
      for (const iid of inmobiliariaIDs) {
        if (iid) await modelo.VincularInmobiliaria(Number(iid));
      }
    }

    if (usuario?.accion === "crear") {
      if (!usuario.correo?.trim() || !usuario.password) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: "correo y password requeridos",
        };
        return;
      }
      if (await correoExiste(usuario.correo.trim())) {
        ctx.response.status = 409;
        ctx.response.body = {
          success: false,
          message: "Correo de acceso ya registrado",
        };
        return;
      }
      const hash = await bcrypt.hash(usuario.password);
      const nuevoId = await crearUsuarioAdmin({
        nombre: (usuario.nombre || nombre || "Constructora").trim(),
        correo: usuario.correo.trim(),
        contrasenaHash: hash,
        rolID: 5,
        estadoCuenta: "Activa",
      });
      await modelo.AsignarUsuario(nuevoId);
    } else if (usuario?.accion === "asignar" && usuario.usuarioID) {
      await modelo.AsignarUsuario(Number(usuario.usuarioID));
    } else if (usuario?.accion === "quitar") {
      await modelo.AsignarUsuario(null);
    }

    ctx.response.status = 200;
    ctx.response.body = { success: true, message: "Constructora actualizada" };
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error al actualizar constructora",
    };
  }
};

const PASSWORD_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function getSuperAdminID(ctx: Context): number {
    const sub = (ctx.state as { user?: { sub?: string } }).user?.sub;
    const id = Number(sub);
    return Number.isInteger(id) && id > 0 ? id : 0;
}

export const verPerfilSuperAdmin = async (ctx: Context): Promise<void> => {
    try {
        const usuarioID = getSuperAdminID(ctx);
        if (!usuarioID) {
            ctx.response.status = 401;
            ctx.response.body = { success: false, error: "No autorizado" };
            return;
        }

        const perfil = await obtenerPerfilSuperAdmin(usuarioID);
        if (!perfil) {
            ctx.response.status = 404;
            ctx.response.body = { success: false, error: "Usuario no encontrado" };
            return;
        }
        if (perfil.rol !== "SuperAdmin") {
            ctx.response.status = 403;
            ctx.response.body = { success: false, error: "Acceso denegado" };
            return;
        }
        if (perfil.estadoCuenta !== "Activa") {
            ctx.response.status = 403;
            ctx.response.body = { success: false, error: "Cuenta inactiva" };
            return;
        }

        const { estadoCuenta: _estado, ...data } = perfil;
        ctx.response.status = 200;
        ctx.response.body = { success: true, data };
    } catch (error) {
        console.error("[superadmin:verPerfil]", error);
        ctx.response.status = 500;
        ctx.response.body = { success: false, error: "Error interno del servidor" };
    }
};

export const actualizarPerfilSuperAdmin = async (ctx: Context): Promise<void> => {
    try {
        const usuarioID = getSuperAdminID(ctx);
        if (!usuarioID) {
            ctx.response.status = 401;
            ctx.response.body = { success: false, error: "No autorizado" };
            return;
        }

        const actual = await obtenerPerfilSuperAdmin(usuarioID);
        if (!actual) {
            ctx.response.status = 404;
            ctx.response.body = { success: false, error: "Usuario no encontrado" };
            return;
        }
        if (actual.rol !== "SuperAdmin") {
            ctx.response.status = 403;
            ctx.response.body = { success: false, error: "Acceso denegado" };
            return;
        }
        if (actual.estadoCuenta !== "Activa") {
            ctx.response.status = 403;
            ctx.response.body = { success: false, error: "Cuenta inactiva" };
            return;
        }

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
            ctx.response.body = { success: false, error: "El nombre no puede superar 100 caracteres" };
            return;
        }

        const telefonoRaw = typeof body.Telefono === "string" ? body.Telefono.trim() : "";
        if (telefonoRaw.length > 20) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, error: "El teléfono no puede superar 20 caracteres" };
            return;
        }
        const telefono = telefonoRaw === "" ? null : telefonoRaw;

        let contrasenaHash: string | undefined;
        const passwordNuevo = body.PasswordNuevo;

        if (passwordNuevo !== undefined && passwordNuevo !== null && passwordNuevo !== "") {
            const passwordActual = body.PasswordActual;
            if (typeof passwordActual !== "string" || passwordActual.length === 0) {
                ctx.response.status = 400;
                ctx.response.body = { success: false, error: "Debes proporcionar tu contraseña actual" };
                return;
            }
            if (typeof passwordNuevo !== "string" || !PASSWORD_REGEX.test(passwordNuevo)) {
                ctx.response.status = 400;
                ctx.response.body = {
                    success: false,
                    error: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial",
                };
                return;
            }

            const usuario = await buscarPorId(usuarioID);
            if (!usuario?.contrasenaHash) {
                ctx.response.status = 400;
                ctx.response.body = { success: false, error: "Tu cuenta no tiene contraseña local" };
                return;
            }

            const coincide = await bcrypt.compare(passwordActual, usuario.contrasenaHash);
            if (!coincide) {
                ctx.response.status = 401;
                ctx.response.body = { success: false, error: "La contraseña actual es incorrecta" };
                return;
            }

            contrasenaHash = await bcrypt.hash(passwordNuevo);
        }

        // Correo, RolID, InmobiliariaID, EstadoCuenta y FotoPerfil del body se ignoran.
        await actualizarPerfil(usuarioID, {
            nombre,
            telefono,
            ...(contrasenaHash ? { contrasenaHash } : {}),
        });

        ctx.response.status = 200;
        ctx.response.body = { success: true, message: "Perfil actualizado correctamente" };
    } catch (error) {
        console.error("[superadmin:actualizarPerfil]", error);
        ctx.response.status = 500;
        ctx.response.body = { success: false, error: "Error interno del servidor" };
    }
};

export const subirFotoPerfilSuperAdmin = async (ctx: Context): Promise<void> => {
    let urlNueva: string | undefined;
    try {
        const usuarioID = getSuperAdminID(ctx);
        if (!usuarioID) {
            ctx.response.status = 401;
            ctx.response.body = { success: false, error: "No autorizado" };
            return;
        }

        const actual = await obtenerPerfilSuperAdmin(usuarioID);
        if (!actual || actual.rol !== "SuperAdmin") {
            ctx.response.status = actual ? 403 : 404;
            ctx.response.body = {
                success: false,
                error: actual ? "Acceso denegado" : "Usuario no encontrado",
            };
            return;
        }
        if (actual.estadoCuenta !== "Activa") {
            ctx.response.status = 403;
            ctx.response.body = { success: false, error: "Cuenta inactiva" };
            return;
        }

        const form = await ctx.request.body.formData();
        const archivo = form.get("foto");

        if (!(archivo instanceof File) || archivo.size === 0) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, error: "Debes adjuntar una imagen en el campo 'foto'" };
            return;
        }

        const resultado = await guardarImagen(archivo, "perfiles");
        if (!resultado.ok || !resultado.url) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, error: resultado.error ?? "No se pudo guardar la imagen" };
            return;
        }

        urlNueva = resultado.url;
        await actualizarFotoPerfil(usuarioID, resultado.url);

        if (actual.fotoPerfil && actual.fotoPerfil !== resultado.url) {
            await eliminarImagenDisco(actual.fotoPerfil);
        }

        ctx.response.status = 200;
        ctx.response.body = {
            success: true,
            message: "Foto de perfil actualizada correctamente",
            data: { url: resultado.url },
        };
    } catch (error) {
        console.error("[superadmin:subirFotoPerfil]", error);
        if (urlNueva) await eliminarImagenDisco(urlNueva);
        ctx.response.status = 500;
        ctx.response.body = { success: false, error: "Error interno del servidor" };
    }
};
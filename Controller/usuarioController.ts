import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { bcrypt } from "../Dependencies/dependencias.ts";
import {
    buscarPorId,
    actualizarPerfil,
    obtenerFavoritos,
    agregarFavorito,
    eliminarFavorito,
    obtenerSolicitudesUsuario,
} from "../Model/usuarioModel.ts";

// ─────────────────────────────────────────
// ACTUALIZAR PERFIL
// ─────────────────────────────────────────
export async function actualizarPerfilUsuario(ctx: Context) {
    try {
        const userState = ctx.state.user as { sub?: string };
        const usuarioId = Number(userState?.sub);
        if (!usuarioId) {
            ctx.response.status = 401;
            ctx.response.body = { error: "No autorizado" };
            return;
        }

        const body = await ctx.request.body.json();
        const { Nombre, Telefono, PasswordActual, PasswordNuevo } = body;

        if (!Nombre?.trim()) {
            ctx.response.status = 400;
            ctx.response.body = { error: "El nombre es obligatorio" };
            return;
        }

        let nuevoHash: string | undefined;

        // Si quiere cambiar contraseña, validar la actual
        if (PasswordNuevo) {
            if (!PasswordActual) {
                ctx.response.status = 400;
                ctx.response.body = { error: "Debes proporcionar tu contraseña actual" };
                return;
            }

            const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
            if (!regexPassword.test(PasswordNuevo)) {
                ctx.response.status = 400;
                ctx.response.body = {
                    error: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial",
                };
                return;
            }

            const usuario = await buscarPorId(usuarioId);
            if (!usuario) {
                ctx.response.status = 404;
                ctx.response.body = { error: "Usuario no encontrado" };
                return;
            }

            // Usuarios de Google pueden no tener hash
            if (!usuario.contrasenaHash) {
                ctx.response.status = 400;
                ctx.response.body = { error: "Tu cuenta no tiene contraseña local" };
                return;
            }

            const valida = await bcrypt.compare(PasswordActual, usuario.contrasenaHash as string);
            if (!valida) {
                ctx.response.status = 401;
                ctx.response.body = { error: "La contraseña actual es incorrecta" };
                return;
            }

            nuevoHash = await bcrypt.hash(PasswordNuevo);
        }

        await actualizarPerfil(usuarioId, {
            nombre: Nombre.trim(),
            telefono: Telefono?.trim() || null,
            ...(nuevoHash ? { contrasenaHash: nuevoHash } : {}),
        });

        ctx.response.status = 200;
        ctx.response.body = { mensaje: "Perfil actualizado correctamente" };
    } catch (error) {
        console.error("Error en actualizarPerfilUsuario:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Error interno del servidor" };
    }
}

// ─────────────────────────────────────────
// FAVORITOS
// ─────────────────────────────────────────
export async function listarFavoritos(ctx: Context) {
    try {
        const userState = ctx.state.user as { sub?: string };
        const usuarioId = Number(userState?.sub);
        if (!usuarioId) {
            ctx.response.status = 401;
            ctx.response.body = { error: "No autorizado" };
            return;
        }

        const favoritos = await obtenerFavoritos(usuarioId);
        ctx.response.status = 200;
        ctx.response.body = { favoritos };
    } catch (error) {
        console.error("Error en listarFavoritos:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Error interno del servidor" };
    }
}

export async function guardarFavorito(ctx: Context) {
    try {
        const userState = ctx.state.user as { sub?: string };
        const usuarioId = Number(userState?.sub);
        if (!usuarioId) {
            ctx.response.status = 401;
            ctx.response.body = { error: "No autorizado" };
            return;
        }

        const body = await ctx.request.body.json();
        const propiedadID = Number(body?.propiedadID);
        if (!propiedadID) {
            ctx.response.status = 400;
            ctx.response.body = { error: "propiedadID es requerido" };
            return;
        }

        await agregarFavorito(usuarioId, propiedadID);
        ctx.response.status = 201;
        ctx.response.body = { mensaje: "Propiedad guardada en favoritos" };
    } catch (error: unknown) {
        // Clave duplicada: ya está en favoritos
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("Duplicate") || msg.includes("duplicate")) {
            ctx.response.status = 409;
            ctx.response.body = { error: "La propiedad ya está en tus favoritos" };
            return;
        }
        console.error("Error en guardarFavorito:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Error interno del servidor" };
    }
}

export async function quitarFavorito(ctx: RouterContext<"/usuario/favoritos/:propiedadID">) {
    try {
        const userState = ctx.state.user as { sub?: string };
        const usuarioId = Number(userState?.sub);
        if (!usuarioId) {
            ctx.response.status = 401;
            ctx.response.body = { error: "No autorizado" };
            return;
        }

        const propiedadID = Number(ctx.params.propiedadID);
        if (!propiedadID) {
            ctx.response.status = 400;
            ctx.response.body = { error: "propiedadID es requerido" };
            return;
        }

        await eliminarFavorito(usuarioId, propiedadID);
        ctx.response.status = 200;
        ctx.response.body = { mensaje: "Propiedad eliminada de favoritos" };
    } catch (error) {
        console.error("Error en quitarFavorito:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Error interno del servidor" };
    }
}

// ─────────────────────────────────────────
// SOLICITUDES
// ─────────────────────────────────────────
export async function listarSolicitudesUsuario(ctx: Context) {
    try {
        const userState = ctx.state.user as { sub?: string };
        const usuarioId = Number(userState?.sub);
        if (!usuarioId) {
            ctx.response.status = 401;
            ctx.response.body = { error: "No autorizado" };
            return;
        }

        const solicitudes = await obtenerSolicitudesUsuario(usuarioId);
        ctx.response.status = 200;
        ctx.response.body = { solicitudes };
    } catch (error) {
        console.error("Error en listarSolicitudesUsuario:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Error interno del servidor" };
    }
}

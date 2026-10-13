import { Context } from "../Dependencies/dependencias.ts";
import { bcrypt } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import { inmobiliarias } from "../Model/schema.ts";
import {
    listarUsuariosAdmin,
    listarRoles,
    crearUsuarioAdmin,
    actualizarUsuarioAdmin,
    correoExiste,
    buscarPorId,
} from "../Model/usuarioModel.ts"; // ajusta imports

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
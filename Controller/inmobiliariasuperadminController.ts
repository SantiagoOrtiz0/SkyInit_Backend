import { Context } from "../Dependencies/dependencias.ts";
import { bcrypt } from "../Dependencies/dependencias.ts";
import { db } from "../Model/conexion.ts";
import { inmobiliarias, usuarios, roles } from "../Model/schema.ts";
import { eq, inArray } from "../Dependencies/dependencias.ts";
import {
    listarUsuariosAdmin,
    listarRoles,
    crearUsuarioAdmin,
    actualizarUsuarioAdmin,
    correoExiste,
    buscarPorId,
} from "../Model/usuarioModel.ts";

// ── Usuarios ────────────────────────────────────────────────────────────────
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

// ── Inmobiliarias ────────────────────────────────────────────────────────────
//
//  GET /superadmin/inmobiliarias          → lista completa con usuarios asignados
//  GET /superadmin/inmobiliarias?lite=1   → solo id/nombre/ciudad (para selects)
//  GET /superadmin/inmobiliarias?disponibles=1&inmobiliariaID=X  → usuarios sin inmob o de esta
//
export const getInmobiliarias = async (ctx: Context) => {
    try {
        const params = ctx.request.url.searchParams;

        // ── Usuarios disponibles para asignar ──────────────────────────────
        if (params.get("disponibles") === "1") {
            const rawId = params.get("inmobiliariaID");
            const inmID = rawId ? Number(rawId) : null;

            // Solo roles que pertenecen a inmobiliarias
            const ROLES_INMOBILIARIA = ["Administrador", "Agente"];

            const filas = await db
                .select({
                    usuarioID: usuarios.usuarioID,
                    nombre: usuarios.nombre,
                    correo: usuarios.correo,
                    rolID: usuarios.rolID,
                    nombreRol: roles.nombreRol,
                    inmobiliariaID: usuarios.inmobiliariaID,
                })
                .from(usuarios)
                .innerJoin(roles, eq(usuarios.rolID, roles.rolID))
                .where(inArray(roles.nombreRol, ROLES_INMOBILIARIA));

            const data = filas.filter(
                (u) =>
                    u.inmobiliariaID === null ||
                    (inmID !== null && u.inmobiliariaID === inmID)
            );

            ctx.response.status = 200;
            ctx.response.body = { success: true, data };
            return;
        }

        // ── Lista ligera para selects ──────────────────────────────────────
        if (params.get("lite") === "1") {
            const data = await db
                .select({
                    inmobiliariaID: inmobiliarias.inmobiliariaID,
                    nombre: inmobiliarias.nombre,
                    ciudad: inmobiliarias.ciudad,
                })
                .from(inmobiliarias);
            ctx.response.status = 200;
            ctx.response.body = { success: true, data };
            return;
        }

        // ── Lista completa con usuarios agrupados ──────────────────────────
        const filas = await db
            .select({
                inmobiliariaID: inmobiliarias.inmobiliariaID,
                nombre: inmobiliarias.nombre,
                contacto: inmobiliarias.contacto,
                telefono: inmobiliarias.telefono,
                correo: inmobiliarias.correo,
                estado: inmobiliarias.estado,
                logo: inmobiliarias.logo,
                descripcion: inmobiliarias.descripcion,
                ciudad: inmobiliarias.ciudad,
                fechaRegistro: inmobiliarias.fechaRegistro,
                // usuario asignado (puede ser null si no hay ninguno)
                usuarioID: usuarios.usuarioID,
                usuarioNombre: usuarios.nombre,
                usuarioCorreo: usuarios.correo,
                usuarioRolID: usuarios.rolID,
                usuarioRolNombre: roles.nombreRol,
            })
            .from(inmobiliarias)
            .leftJoin(usuarios, eq(usuarios.inmobiliariaID, inmobiliarias.inmobiliariaID))
            .leftJoin(roles, eq(usuarios.rolID, roles.rolID));

        // Agrupar: 1 inmobiliaria → N usuarios
        const mapa = new Map<number, any>();
        for (const f of filas) {
            if (!mapa.has(f.inmobiliariaID)) {
                mapa.set(f.inmobiliariaID, {
                    inmobiliariaID: f.inmobiliariaID,
                    nombre: f.nombre,
                    contacto: f.contacto,
                    telefono: f.telefono,
                    correo: f.correo,
                    estado: f.estado,
                    logo: f.logo,
                    descripcion: f.descripcion,
                    ciudad: f.ciudad,
                    fechaRegistro: f.fechaRegistro,
                    usuariosAsignados: [],
                });
            }
            if (f.usuarioID) {
                mapa.get(f.inmobiliariaID).usuariosAsignados.push({
                    usuarioID: f.usuarioID,
                    nombre: f.usuarioNombre,
                    correo: f.usuarioCorreo,
                    rolID: f.usuarioRolID,
                    nombreRol: f.usuarioRolNombre,
                });
            }
        }

        ctx.response.status = 200;
        ctx.response.body = { success: true, data: Array.from(mapa.values()) };
    } catch (e) {
        console.error(e);
        ctx.response.status = 500;
        ctx.response.body = { success: false, message: "Error al listar inmobiliarias" };
    }
};

// ── Crear inmobiliaria ───────────────────────────────────────────────────────
export const postInmobiliaria = async (ctx: Context) => {
    try {
        const body = await ctx.request.body.json();
        const { nombre, contacto, telefono, correo, estado, descripcion, ciudad, usuariosAsignados } = body;

        if (!nombre?.trim()) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, message: "El nombre es obligatorio" };
            return;
        }

        const [resultado] = await db.insert(inmobiliarias).values({
            nombre: nombre.trim(),
            contacto: contacto?.trim() || null,
            telefono: telefono?.trim() || null,
            correo: correo?.trim() || null,
            estado: estado || "Activa",
            descripcion: descripcion?.trim() || null,
            ciudad: ciudad?.trim() || null,
        });
        const newId = Number((resultado as any).insertId ?? 0);

        // Asignar usuarios si se enviaron
        if (Array.isArray(usuariosAsignados) && usuariosAsignados.length > 0) {
            for (const uid of usuariosAsignados) {
                await db
                    .update(usuarios)
                    .set({ inmobiliariaID: newId })
                    .where(eq(usuarios.usuarioID, Number(uid)));
            }
        }

        ctx.response.status = 201;
        ctx.response.body = { success: true, message: "Inmobiliaria creada", id: newId };
    } catch (e) {
        console.error(e);
        ctx.response.status = 500;
        ctx.response.body = { success: false, message: "Error al crear inmobiliaria" };
    }
};

// ── Editar inmobiliaria ──────────────────────────────────────────────────────
export const putInmobiliaria = async (ctx: Context) => {
    try {
        const id = Number((ctx as any).params?.id);
        if (!id || isNaN(id)) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, message: "ID inválido" };
            return;
        }

        const body = await ctx.request.body.json();
        const { nombre, contacto, telefono, correo, estado, descripcion, ciudad } = body;

        if (!nombre?.trim()) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, message: "El nombre es obligatorio" };
            return;
        }

        await db
            .update(inmobiliarias)
            .set({
                nombre: nombre.trim(),
                contacto: contacto?.trim() || null,
                telefono: telefono?.trim() || null,
                correo: correo?.trim() || null,
                estado: estado || "Activa",
                descripcion: descripcion?.trim() || null,
                ciudad: ciudad?.trim() || null,
            })
            .where(eq(inmobiliarias.inmobiliariaID, id));

        ctx.response.status = 200;
        ctx.response.body = { success: true, message: "Inmobiliaria actualizada" };
    } catch (e) {
        console.error(e);
        ctx.response.status = 500;
        ctx.response.body = { success: false, message: "Error al actualizar inmobiliaria" };
    }
};

// ── Asignar / quitar usuarios ────────────────────────────────────────────────
export const patchAsignarUsuarios = async (ctx: Context) => {
    try {
        const id = Number((ctx as any).params?.id);
        if (!id || isNaN(id)) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, message: "ID de inmobiliaria inválido" };
            return;
        }

        const body = await ctx.request.body.json();
        const agregar: number[] = Array.isArray(body.agregar) ? body.agregar : [];
        const quitar: number[]  = Array.isArray(body.quitar)  ? body.quitar  : [];

        for (const uid of agregar) {
            await db
                .update(usuarios)
                .set({ inmobiliariaID: id })
                .where(eq(usuarios.usuarioID, Number(uid)));
        }
        for (const uid of quitar) {
            await db
                .update(usuarios)
                .set({ inmobiliariaID: null })
                .where(eq(usuarios.usuarioID, Number(uid)));
        }

        ctx.response.status = 200;
        ctx.response.body = { success: true, message: "Asignaciones actualizadas" };
    } catch (e) {
        console.error(e);
        ctx.response.status = 500;
        ctx.response.body = { success: false, message: "Error al asignar usuarios" };
    }
};

// ── Usuarios (gestión de cuentas) ────────────────────────────────────────────
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
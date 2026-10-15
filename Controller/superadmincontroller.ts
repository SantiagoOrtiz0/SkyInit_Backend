import { Context, RouterContext} from "../Dependencies/dependencias.ts";
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
import { Constructora } from "../Model/constructoraModel.ts";
import { Context,RouterContext } from "../Dependencies/dependencias.ts";
import { buscarPorId } from "../Model/usuarioModel.ts";

export const getConstructoras = async (ctx: Context) => {
    const { response, state } = ctx;

    try {
        const userState = state.user as { sub?: string; rol?: string };
        const usuarioId = Number(userState?.sub);

        if (!usuarioId) {
        response.status = 401;
        response.body = { success: false, message: "No autorizado" };
        return;
        }

        const usuario = await buscarPorId(usuarioId);
        const inmobiliariaID = Number(
        (usuario as { inmobiliariaID?: number })?.inmobiliariaID ?? 0,
        );

        // Si el admin no tiene inmobiliaria, lista vacía (no todas)
        if (!inmobiliariaID) {
        response.status = 200;
        response.body = {
            success: true,
            data: [],
            message: "El administrador no tiene inmobiliaria asignada",
        };
            return;
            }

            const constructora = new Constructora();


            const lista = await constructora.SeleccionarPorInmobiliaria(inmobiliariaID);

            // No mostrar inactivas en el panel admin (salvo ?estado=Inactivo)
            const estadoParam = ctx.request.url.searchParams.get("estado");
            let data = lista;

            if (estadoParam) {
            data = lista.filter(
                (c) => String(c.estado || "") === estadoParam,
            );
            } else {
            data = lista.filter(
                (c) => String(c.estado || "").toLowerCase() !== "inactivo",
            );
            }

            response.status = 200;
            response.body = { success: true, data };
            
        } catch (error) {
        console.error("ERROR AL LISTAR CONSTRUCTORAS:", error);
        response.status = 500;
        response.body = {
        success: false,
        message: "Error al listar constructoras",
        };
    }
};

export const getConstructorasporId = async (ctx:RouterContext<string>) => {

    const {response,params} = ctx

    try {

        const id = Number(params.id);
        if (isNaN (id)){
            response.status = 400;
            response.body = {
                success: false,
                mensaje: "El ID de la constructora no es válido",
            };
            return;
        }


        const constructora = new Constructora(null, id);
        const data = await constructora.SeleccionarConstructoraporId();


        if (!data) {
        response.status = 404;
        response.body = {
            success: false,
            message: "Constructora no encontrada",
        };
        return;
    }

        response.status = 200;
        response.body = {
            success:true,
            data
        };
        
    } catch (error) {
            console.error("ERROR AL OBTENER CONSTRUCTORA:", error);
            response.status = 500;
            response.body = {
            success: false,
            message: "Error al obtener la constructora",
            };
    }

};

export const postConstructora = async (ctx: Context) => {
  const { response, request, state } = ctx;

  try {
    if (!request.hasBody) {
      response.status = 400;
      response.body = {
        success: false,
        message: "El cuerpo de la petición está vacío",
      };
      return;
    }

    const body = await request.body.json();
    const {
      nombre,
      descripcion,
      contacto,
      telefono,
      correo,
      estado,
      logo,
      ciudad,
      usuarioID,
      inmobiliariaID,
    } = body;

    if (!nombre || !descripcion) {
      response.status = 400;
      response.body = {
        success: false,
        message: "nombre y descripcion son obligatorios",
      };
      return;
    }

    // Quién está creando
    const userState = state.user as {
      sub?: string;
      rol?: string;
      nombreRol?: string;
    };
    const rol = String(userState?.rol ?? userState?.nombreRol ?? "");
    const usuarioId = Number(userState?.sub);

    // Inmobiliaria a vincular
    let inmoId: number | null = inmobiliariaID
      ? Number(inmobiliariaID)
      : null;

    // Admin: si no manda inmobiliaria, usar la de su usuario
    if ((!inmoId || isNaN(inmoId)) && rol === "Administrador" && usuarioId) {
      const u = await buscarPorId(usuarioId);
      const idInmo = Number(
        (u as { inmobiliariaID?: number })?.inmobiliariaID ?? 0,
      );
      inmoId = idInmo > 0 ? idInmo : null;
    }

    if (rol === "Administrador" && !inmoId) {
      response.status = 400;
      response.body = {
        success: false,
        message:
          "Tu cuenta de administrador no tiene inmobiliaria asignada. No se puede crear la constructora.",
      };
      return;
    }

    const constructora = new Constructora({
      nombre,
      descripcion,
      contacto,
      telefono,
      correo,
      estado: estado ?? "Activo",
      logo,
      ciudad,
      usuarioID: usuarioID ?? null,
    });

    // Usa el método que tengas: CrearConstructora o InsertarConstructora
    const nuevoId = await constructora.CrearConstructora();
    // const nuevoId = await constructora.InsertarConstructora();

    if (!nuevoId) {
      response.status = 500;
      response.body = {
        success: false,
        message: "No se pudo crear la constructora",
      };
      return;
    }

    if (inmoId) {
      const c = new Constructora(null, nuevoId);
      await c.VincularInmobiliaria(inmoId);
    }

    response.status = 201;
    response.body = {
      success: true,
      mensaje: "Constructora creada correctamente",
      id: nuevoId,
      inmobiliariaID: inmoId,
    };
  } catch (error) {
    console.error("ERROR AL CREAR CONSTRUCTORA:", error);
    response.status = 500;
    response.body = {
      success: false,
      mensaje: "Error al crear la constructora",
    };
  }
};

export const putConstructora = async (ctx: RouterContext<string>) => {
    const { response, params, request } = ctx;
    try {
        const id = Number(params.id);

        if (isNaN(id)) {
        response.status = 400;
        response.body = {
            success: false,
            message: "El ID de la constructora no es válido",
        };
        return;
        }

        const body = await request.body.json();
        const {
        nombre,
        descripcion,
        contacto,
        telefono,
        correo,
        estado,
        logo,
        ciudad,
        usuarioID,
        inmobiliariaID,
        } = body;

        const constructora = new Constructora(
        {
            constructoraID: id,
            nombre,
            descripcion,
            contacto,
            telefono,
            correo,
            estado,
            logo,
            ciudad,
            usuarioID,
        },
        id,
        );

        await constructora.ActualizarConstructora();

        if (inmobiliariaID !== undefined) {
        const actuales = await constructora.ListarInmobiliariasVinculadas();
        for (const a of actuales) {
            await constructora.DesvincularInmobiliaria(a.inmobiliariaID);
        }
        if (inmobiliariaID) {
            await constructora.VincularInmobiliaria(Number(inmobiliariaID));
        }
        }

        // ← ESTO FALTABA
        response.status = 200;
        response.body = {
        success: true,
        message: "Constructora actualizada correctamente",
        };
    } catch (error) {
        console.error("ERROR AL ACTUALIZAR CONSTRUCTORA:", error);
        response.status = 500;
        response.body = {
        success: false,
        message: "Error al actualizar la constructora",
        };
    }
};

export const deleteConstructora = async (ctx: RouterContext<string>) => {
    const { response, params } = ctx;

    try {
        const id = Number(params.id);

        if (isNaN(id)) {
        response.status = 400;
        response.body = {
            success: false,
            message: "El ID de la constructora no es válido",
        };
        return;
        }

        const constructora = new Constructora(null, id);
        const resultado = await constructora.EliminarConstructora();

        if (!resultado) {
        response.status = 404;
        response.body = {
            success: false,
            message: "Constructora no encontrada",
        };
        return;
        }

        response.status = 200;
        response.body = {
        success: true,
        message: "Constructora eliminada correctamente",
        };
    } catch (error) {
        console.error("ERROR AL ELIMINAR CONSTRUCTORA:", error);
        response.status = 500;
        response.body = {
        success: false,
        message: "Error al eliminar la constructora",
        };
    }
};

    export const postVincularInmobiliaria = async (ctx: RouterContext<string>) => {
        const { response, params, request } = ctx;
        try {
            const id = Number(params.id); // constructoraID
            if (isNaN(id)) {
                response.status = 400;
                response.body = { success: false, message: "ID de constructora no válido" };
                return;
            }

            const body = await request.body.json();
            const inmobiliariaID = Number(body.inmobiliariaID);
            if (!inmobiliariaID || isNaN(inmobiliariaID)) {
                response.status = 400;
                response.body = { success: false, message: "inmobiliariaID es obligatorio" };
                return;
            }

            const constructora = new Constructora(null, id);
            await constructora.VincularInmobiliaria(inmobiliariaID);

            response.status = 201;
            response.body = { success: true, message: "Constructora vinculada correctamente" };
        } catch (error) {
            console.error("ERROR AL VINCULAR INMOBILIARIA:", error);
            response.status = 500;
            response.body = { success: false, message: "Error al vincular la inmobiliaria" };
        }
    };

    export const deleteDesvincularInmobiliaria = async (ctx: RouterContext<string>) => {
        const { response, params, request } = ctx;
        try {
            const id = Number(params.id); // constructoraID
            if (isNaN(id)) {
                response.status = 400;
                response.body = { success: false, message: "ID de constructora no válido" };
                return;
            }

            const body = await request.body.json();
            const inmobiliariaID = Number(body.inmobiliariaID);
            if (!inmobiliariaID || isNaN(inmobiliariaID)) {
                response.status = 400;
                response.body = { success: false, message: "inmobiliariaID es obligatorio" };
                return;
            }

            const constructora = new Constructora(null, id);
            await constructora.DesvincularInmobiliaria(inmobiliariaID);

            response.status = 200;
            response.body = { success: true, message: "Constructora desvinculada correctamente" };
        } catch (error) {
            console.error("ERROR AL DESVINCULAR INMOBILIARIA:", error);
            response.status = 500;
            response.body = { success: false, message: "Error al desvincular la inmobiliaria" };
        }
    };
export const getConstructorasPublicas = async (ctx: Context) => {
    try {
        const modelo = new Constructora();
        const data = await modelo.SeleccionarConstructorasPublicas();
        ctx.response.status = 200;
        ctx.response.body = { success: true, data };
    } catch (error) {
        console.error("ERROR AL LISTAR CONSTRUCTORAS PUBLICAS:", error);
        ctx.response.status = 500;
        ctx.response.body = { success: false, message: "Error al listar constructoras" };
    }
};

export const getInmobiliarias = async (ctx: Context) => {
    try {
        const modelo = new Constructora();
        const data = await modelo.SeleccionarInmobiliarias();
        ctx.response.status = 200;
        ctx.response.body = { success: true, data };
    } catch (error) {
        console.error("ERROR AL LISTAR INMOBILIARIAS:", error);
        ctx.response.status = 500;
        ctx.response.body = {
        success: false,
        message: "Error al listar inmobiliarias",
        };
    }
};



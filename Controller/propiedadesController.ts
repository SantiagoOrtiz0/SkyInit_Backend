import { and, Context, eq } from "../Dependencies/dependencias.ts";
import { Propiedad } from "../Model/propiedadesModel.ts";
import { eliminarImagenDisco, guardarImagen } from "../Helpers/upload.ts";
import { db } from "../Model/conexion.ts";
import { constructoras, roles, usuarios } from "../Model/schema.ts";
import {
  obtenerInmobiliariaScope,
  ScopeError,
} from "../Middlewares/inmobiliariasScope.ts";
import { Constructora } from "../Model/constructoraModel.ts";
import { esAgenteDeInmobiliaria } from "../Model/usuarioModel.ts";

// ── Aislamiento por inmobiliaria ─────────────────────────────────────────────

// Inmobiliaria del usuario autenticado (cualquier rol), leida de la BD
async function inmobiliariaDelUsuario(ctx: any): Promise<number | null> {
  const id = Number(ctx.state.user?.sub);
  if (!id) return null;
  const [u] = await db
    .select({ inmobiliariaID: usuarios.inmobiliariaID })
    .from(usuarios)
    .where(eq(usuarios.usuarioID, id))
    .limit(1);
  return u?.inmobiliariaID ?? null;
}

// SuperAdmin sin ?inmobiliariaId= ve toda la plataforma; el resto queda acotado
function superAdminSinFiltro(ctx: any): boolean {
  return ctx.state.user?.rol === "SuperAdmin" &&
    !ctx.request.url.searchParams.get("inmobiliariaId");
}

const vacio = (v: unknown) => v === undefined || v === null || v === "";

// Devuelve un mensaje si el agente o la constructora del body no son de la inmobiliaria
async function referenciaAjena(
  inmobiliariaId: number,
  agenteID: unknown,
  constructoraID: unknown,
): Promise<string | null> {
  if (
    !vacio(agenteID) &&
    !(await esAgenteDeInmobiliaria(Number(agenteID), [inmobiliariaId]))
  ) {
    return "El agente indicado no pertenece a tu inmobiliaria";
  }
  if (
    !vacio(constructoraID) &&
    !(await new Constructora(null, Number(constructoraID))
      .EstaVinculadaAInmobiliaria(inmobiliariaId))
  ) {
    return "La constructora indicada no esta vinculada a tu inmobiliaria";
  }
  return null;
}

// latitud / longitud opcionales del body:
//   ausente = no se toca · null (o "") = se borra · numero = se guarda con 7 decimales
export function leerCoordenadasOpcionales(body: any):
  | { ok: true; latitud?: string | null; longitud?: string | null }
  | { ok: false; error: string } {
  const out: { ok: true; latitud?: string | null; longitud?: string | null } = {
    ok: true,
  };
  for (const [campo, max] of [["latitud", 90], ["longitud", 180]] as const) {
    const v = body?.[campo];
    if (v === undefined) continue;
    if (v === null || v === "") {
      out[campo] = null;
      continue;
    }
    const n = typeof v === "number" || typeof v === "string" ? Number(v) : NaN;
    if (!Number.isFinite(n) || Math.abs(n) > max) {
      return {
        ok: false,
        error: `La ${campo} debe ser un numero entre -${max} y ${max}`,
      };
    }
    out[campo] = n.toFixed(7);
  }
  if (
    out.latitud !== undefined && out.longitud !== undefined &&
    (out.latitud === null) !== (out.longitud === null)
  ) {
    return {
      ok: false,
      error: "latitud y longitud deben enviarse juntas (ambas con valor o ambas null)",
    };
  }
  return out;
}

// ── Admin ────────────────────────────────────────────────────────────────────

export const ListarPropiedadesAdmin = async (ctx: any) => {
  try {
    // El Administrador solo lista las propiedades de SU inmobiliaria
    const modelo = new Propiedad();
    const lista = superAdminSinFiltro(ctx)
      ? await modelo.SeleccionarTodasAdmin()
      : await modelo.SeleccionarPorInmobiliaria(
        (await obtenerInmobiliariaScope(ctx)).inmobiliariaId,
      );
    ctx.response.status = 200;
    ctx.response.body = lista;
  } catch (error) {
    if (error instanceof ScopeError) {
      ctx.response.status = error.status;
      ctx.response.body = { error: error.message };
      return;
    }
    console.log(error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error al listar las propiedades" };
  }
};

export const listarAgentes = async (ctx: any) => {
  try {
    // El Administrador solo ve los agentes de SU inmobiliaria
    const filtroInmobiliaria = superAdminSinFiltro(ctx)
      ? undefined
      : eq(
        usuarios.inmobiliariaID,
        (await obtenerInmobiliariaScope(ctx)).inmobiliariaId,
      );

    const agentes = await db
      .select({
        usuarioID: usuarios.usuarioID,
        nombre: usuarios.nombre,
        correo: usuarios.correo,
      })
      .from(usuarios)
      .innerJoin(roles, eq(usuarios.rolID, roles.rolID))
      .where(
        and(
          eq(roles.nombreRol, "Agente"),
          eq(usuarios.estadoCuenta, "Activa"),
          filtroInmobiliaria,
        ),
      )
      .orderBy(usuarios.nombre);

    ctx.response.status = 200;
    ctx.response.body = agentes;
  } catch (error) {
    if (error instanceof ScopeError) {
      ctx.response.status = error.status;
      ctx.response.body = { error: error.message };
      return;
    }
    console.log(error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error al listar los agentes" };
  }
};

// ── Públicas ─────────────────────────────────────────────────────────────────

export const listarPropiedades = async (ctx: Context) => {
  try {
    const params = ctx.request.url.searchParams;
    const modeloPropiedad = new Propiedad();

    const propiedades = await modeloPropiedad.SeleccionarPropiedades({
      ciudad: params.get("ciudad") ?? undefined,
      tipoOperacionID: params.get("tipoOperacionID")
        ? Number(params.get("tipoOperacionID"))
        : undefined,
      habitaciones: params.get("habitaciones")
        ? Number(params.get("habitaciones"))
        : undefined,
      precioMin: params.get("precioMin")
        ? Number(params.get("precioMin"))
        : undefined,
      precioMax: params.get("precioMax")
        ? Number(params.get("precioMax"))
        : undefined,
      orden: (params.get("orden") as "precio_asc" | "precio_desc" | "fecha") ??
        undefined,
    });

    ctx.response.status = 200;
    ctx.response.body = propiedades;
  } catch (error) {
    console.log(error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error al listar las propiedades" };
  }
};

export const listarDestacadas = async (ctx: Context) => {
  try {
    const modeloPropiedad = new Propiedad();
    const propiedades = await modeloPropiedad.SeleccionarDestacadas();

    ctx.response.status = 200;
    ctx.response.body = propiedades;
  } catch (error) {
    console.log(error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error al listar las propiedades destacadas" };
  }
};

export const listarPorAgente = async (ctx: any) => {
  try {
    const { agenteID } = ctx.params;
    const modeloPropiedad = new Propiedad();
    const propiedades = await modeloPropiedad.SeleccionarPorAgente(
      Number(agenteID),
    );

    ctx.response.status = 200;
    // Ruta publica: solo se expone lo publicado en el catalogo
    ctx.response.body = propiedades.filter((p) => p.estado === "Disponible");
  } catch (error) {
    console.log(error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error al listar las propiedades del agente" };
  }
};

export const consultarPropiedad = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const modeloPropiedad = new Propiedad(null, Number(id));
    const propiedad = await modeloPropiedad.ConsultarPropiedad();

    if (!propiedad) {
      ctx.response.status = 404;
      ctx.response.body = {
        error: "No ha sido encontrada la propiedad consultada",
      };
      return;
    }
    // Solo campos públicos
    ctx.response.status = 200;
    ctx.response.body = { propiedad };
  } catch (error) {
    console.log(error);
    ctx.response.status = 500;
    ctx.response.body = {
      error:
        "Error al consultar la propiedad, no se pudo procesar la solicitud",
    };
  }
};

export const consultarPropiedadDetalle = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const modeloPropiedad = new Propiedad(null, Number(id));

    const rol = (ctx.state as any).user?.rol;
    // Administrador / Agente ven propiedades no publicadas solo si son de SU
    // inmobiliaria; de las ajenas ven lo mismo que el catalogo publico.
    const esGestor = rol === "Administrador" || rol === "Agente";
    let verTodas = rol === "SuperAdmin";
    if (esGestor) {
      const inmobiliariaId = await inmobiliariaDelUsuario(ctx);
      verTodas = !!inmobiliariaId &&
        (await modeloPropiedad.PerteneceAInmobiliaria(inmobiliariaId));
    }
    const propiedad = await modeloPropiedad.ConsultarPropiedad(!verTodas);

    if (!propiedad) {
      if (
        esGestor && !verTodas &&
        (await modeloPropiedad.ConsultarPropiedad(false))
      ) {
        ctx.response.status = 403;
        ctx.response.body = { error: "No tienes permisos sobre esta propiedad" };
        return;
      }
      ctx.response.status = 404;
      ctx.response.body = { error: "Propiedad no encontrada o no disponible" };
      return;
    }
    ctx.response.status = 200;
    ctx.response.body = { propiedad };
  } catch (error) {
    console.log(error);
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Error al consultar el detalle de la propiedad",
    };
  }
};

export const listarSimilares = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const modeloPropiedad = new Propiedad(null, Number(id));
    const propiedad = await modeloPropiedad.ConsultarPropiedad();

    if (!propiedad) {
      ctx.response.status = 404;
      ctx.response.body = {
        error: "No ha sido encontrada la propiedad consultada",
      };
      return;
    }

    if (!propiedad.ciudad) {
      ctx.response.status = 200;
      ctx.response.body = [];
      return;
    }

    const similares = await new Propiedad().SeleccionarSimilares(
      propiedad.ciudad,
      propiedad.tipoOperacionID,
    );
    ctx.response.status = 200;
    ctx.response.body = similares.filter((p) => p.propiedadID !== Number(id));
  } catch (error) {
    console.log(error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error al listar las propiedades similares" };
  }
};

// ── Privadas ─────────────────────────────────────────────────────────────────

export const crearPropiedad = async (ctx: Context) => {
  try {
    const body = await ctx.request.body.json();
    const {
      titulo,
      descripcion,
      precio,
      tipoOperacionID,
      habitaciones,
      direccion,
      ciudad,
      constructoraID,
      agenteID,
      estado,
      destacada,
    } = body;

    if (!titulo || !precio || !tipoOperacionID || !direccion) {
      ctx.response.status = 400;
      ctx.response.body = {
        error: "Titulo, precio, tipoOperacionID y direccion son obligatorios",
      };
      return;
    }

    const usuario = (ctx.state as any).user;
    const rol = usuario?.rol;
    // Agente se asigna a sí mismo; admin puede dejarlo null
    const idAgente = agenteID ??
      (rol === "Agente" ? Number(usuario?.sub) : null);


      const scope = await obtenerInmobiliariaScope(ctx);

    // El agente y la constructora del body deben ser de la misma inmobiliaria
    const ajena = await referenciaAjena(
      scope.inmobiliariaId,
      idAgente,
      constructoraID,
    );
    if (ajena) {
      ctx.response.status = 403;
      ctx.response.body = { error: ajena };
      return;
    }

    const coords = leerCoordenadasOpcionales(body);
    if (!coords.ok) {
      ctx.response.status = 400;
      ctx.response.body = { error: coords.error };
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
      inmobiliariaID: scope.inmobiliariaId,
      latitud: coords.latitud,
      longitud: coords.longitud,
    });

    const filasAfectadas = await nuevaPropiedad.InsertarPropiedad();
    if (filasAfectadas > 0) {
      ctx.response.status = 201;
      ctx.response.body = { message: "Propiedad creada correctamente" };
    } else {
      ctx.response.status = 409;
      ctx.response.body = { error: "No se pudo crear la propiedad" };
    }
  } catch (error) {
    if (error instanceof ScopeError) {
      ctx.response.status = error.status;
      ctx.response.body = { error: error.message };
      return;
    }
    console.log(error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error interno al crear la propiedad" };
  }
};

export const editarPropiedad = async (ctx: any) => {
  try {
    const { id } = ctx.params;
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
    const {
      titulo,
      descripcion,
      precio,
      tipoOperacionID,
      habitaciones,
      direccion,
      ciudad,
      constructoraID,
      agenteID,
      estado,
      destacada,
    } = body;

    if (!titulo || !precio || !tipoOperacionID || !direccion) {
      ctx.response.status = 400;
      ctx.response.body = {
        error: "Titulo, precio, tipoOperacionID y direccion son obligatorios",
      };
      return;
    }

    // Si cambia el agente o la constructora, deben ser de la misma inmobiliaria
    const actual = await new Propiedad(null, idPropiedad).ConsultarPropiedad(
      false,
    );
    const scope = await obtenerInmobiliariaScope(ctx);
    const ajena = await referenciaAjena(
      scope.inmobiliariaId,
      !vacio(agenteID) && Number(agenteID) !== actual?.agenteID
        ? agenteID
        : null,
      !vacio(constructoraID) && Number(constructoraID) !== actual?.constructoraID
        ? constructoraID
        : null,
    );
    if (ajena) {
      ctx.response.status = 403;
      ctx.response.body = { error: ajena };
      return;
    }

    const coords = leerCoordenadasOpcionales(body);
    if (!coords.ok) {
      ctx.response.status = 400;
      ctx.response.body = { error: coords.error };
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
      latitud: coords.latitud,
      longitud: coords.longitud,
      // inmobiliariaID no se toca
    }, Number(id));

    const filasAfectadas = await propiedadEditada.ActualizarPropiedad();
    if (filasAfectadas > 0) {
      ctx.response.status = 200;
      ctx.response.body = { message: "Propiedad actualizada correctamente" };
    } else {
      ctx.response.status = 404;
      ctx.response.body = { error: "Propiedad no encontrada o sin cambios" };
    }
  } catch (error) {
    if (error instanceof ScopeError) {
      ctx.response.status = error.status;
      ctx.response.body = { error: error.message };
      return;
    }
    console.log(error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error al editar la propiedad" };
  }
};

export const eliminarPropiedad = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const idPropiedad = Number(id);

    if (Number.isNaN(idPropiedad)) {
      ctx.response.status = 400;
      ctx.response.body = { error: "ID de propiedad invalido" };
      return;
    }
    if (!(await puedeGestionarPropiedad(ctx, idPropiedad))) {
      ctx.response.status = 403;
      ctx.response.body = { error: "No tiene permisos sobre esta propiedad" };
      return;
    }

    const modeloPropiedad = new Propiedad(null, Number(id));
    const filasAfectadas = await modeloPropiedad.EliminarPropiedad();

    if (filasAfectadas > 0) {
      ctx.response.status = 200;
      ctx.response.body = { message: "Propiedad eliminada correctamente" };
    } else {
      ctx.response.status = 404;
      ctx.response.body = { error: "Propiedad no encontrada" };
    }
  } catch (error) {
    console.log(error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error al eliminar la propiedad" };
  }
};

// ── Permisos ──────────────────────────────────────────────────────────────────

async function puedeGestionarPropiedad(
  ctx: any,
  idPropiedad: number,
): Promise<boolean> {
  const usuario = ctx.state.user as { sub?: string; rol?: string } | undefined;
  const modeloPropiedad = new Propiedad(null, idPropiedad);

  if (usuario?.rol === "Administrador") {
    // El administrador solo gestiona propiedades de SU inmobiliaria
    try {
      const scope = await obtenerInmobiliariaScope(ctx);
      return await modeloPropiedad.PerteneceAInmobiliaria(scope.inmobiliariaId);
    } catch (e) {
      if (e instanceof ScopeError) return false;
      throw e;
    }
  }

  if (usuario?.rol === "Constructora") {
    const [fila] = await db
      .select({
        constructoraID: constructoras.constructoraID,
        estado: constructoras.estado,
      })
      .from(constructoras)
      .where(eq(constructoras.usuarioID, Number(usuario?.sub)))
      .limit(1);

    if (!fila || fila.estado !== "Activo") return false;
    return await modeloPropiedad.PerteneceAConstructora(fila.constructoraID);
  }

  // Agente: la propiedad debe estar asignada a el Y ser de su inmobiliaria
  const inmobiliariaId = await inmobiliariaDelUsuario(ctx);
  return !!inmobiliariaId &&
    (await modeloPropiedad.PerteneceAAgente(Number(usuario?.sub))) &&
    (await modeloPropiedad.PerteneceAInmobiliaria(inmobiliariaId));
}

// ── Imágenes ──────────────────────────────────────────────────────────────────

export const postImagenPropiedad = async (ctx: any) => {
  let urlGuardada: string | undefined;
  try {
    const { id } = ctx.params;
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
      ctx.response.body = {
        error: resultado.error ?? "No se pudo guardar la imagen",
      };
      return;
    }

    urlGuardada = resultado.url;
    const modeloPropiedad = new Propiedad(null, idPropiedad);
    const imagenID = await modeloPropiedad.InsertarImagen(resultado.url);

    ctx.response.status = 201;
    ctx.response.body = {
      message: "Imagen agregada",
      data: { imagenID, url: resultado.url },
    };
  } catch (error) {
    console.log(error);
    await eliminarImagenDisco(urlGuardada);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error al subir la imagen de la propiedad" };
  }
};

export const deleteImagenPropiedad = async (ctx: any) => {
  try {
    const { id, imagenId } = ctx.params;
    const idPropiedad = Number(id);
    const IdImagen = Number(imagenId);

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

    if (url === null) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Imagen no encontrada" };
      return;
    }

    await eliminarImagenDisco(url);

    ctx.response.status = 200;
    ctx.response.body = { message: "Imagen eliminada correctamente" };
  } catch (error) {
    console.log(error);
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Error al eliminar la imagen de la propiedad",
    };
  }
};

// - Panel inmobiliaria

export const listarPropiedadesInmobiliaria = async (ctx: Context) => {
  try {
    const scope = await obtenerInmobiliariaScope(ctx);
    const propiedadesList = await new Propiedad().SeleccionarPorInmobiliaria(
      scope.inmobiliariaId,
    );
    ctx.response.status = 200;
    ctx.response.body = propiedadesList;
  } catch (error) {
    if (error instanceof ScopeError) {
        ctx.response.status = error.status;
        ctx.response.body = { error: error.message };
        return;
    }
    console.log(error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error al listar las propiedades de la inmobiliaria"};
  }
};

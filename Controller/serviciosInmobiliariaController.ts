import { Context } from "../Dependencies/dependencias.ts";
import {
  obtenerInmobiliariaScope,
  ScopeError,
} from "../Middlewares/inmobiliariasScope.ts";
import * as Model from "../Model/serviciosInmobiliariaModel.ts";
import { guardarImagen } from "../Helpers/upload.ts";

function responderOk(
  ctx: Context,
  data: unknown,
  message: string,
  status = 200,
): void {
  ctx.response.status = status;
  ctx.response.body = { ok: true, data, message };
}

function responderError(
  ctx: Context,
  status: number,
  message: string,
  errors?: Record<string, string>,
): void {
  ctx.response.status = status;
  ctx.response.body = {
    ok: false,
    data: null,
    message,
    ...(errors ? { errors } : {}),
  };
}

function manejarError(ctx: Context, e: unknown): void {
  if (e instanceof ScopeError) {
    responderError(ctx, e.status, e.message);
    return;
  }
  console.error("[serviciosInmobiliaria] Error:", (e as Error)?.message);
  responderError(ctx, 500, "Error interno del servidor");
}

function parseId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function paramId(ctx: Context): string | undefined {
  return (ctx as unknown as { params?: { id?: string } }).params?.id;
}

async function leerJson(ctx: Context): Promise<Record<string, unknown> | null> {
  try {
    return (await ctx.request.body.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const IMAGEN_RE =
  /^\/(img\/Servicios|uploads\/servicios)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i;

const ESTADOS_VALIDOS = ["Activo", "Inactivo"] as const;
type Estado = (typeof ESTADOS_VALIDOS)[number];

interface PayloadValidado {
  Nombre: string;
  Descripcion: string;
  Precio: string;
  Estado: Estado;
  Imagen: string | null;
}

function validarPayload(body: Record<string, unknown>): {
  errores: Record<string, string>;
  datos: PayloadValidado;
} {
  const errores: Record<string, string> = {};

  const nombreRaw = typeof body.Nombre === "string" ? body.Nombre.trim() : "";
  if (nombreRaw.length < 3 || nombreRaw.length > 150) {
    errores.Nombre = "Nombre debe tener entre 3 y 150 caracteres";
  }

  const descRaw =
    typeof body.Descripcion === "string" ? body.Descripcion.trim() : "";
  if (descRaw.length < 20) {
    errores.Descripcion = "Descripcion debe tener al menos 20 caracteres";
  }

  const precioNum = Number(body.Precio);
  if (!Number.isFinite(precioNum) || precioNum <= 0 || precioNum > 9999999999.99) {
    errores.Precio = "Precio debe ser mayor a 0 y menor o igual a 9999999999.99";
  }

  let estadoFinal: Estado = "Activo";
  if (body.Estado !== undefined) {
    if (
      typeof body.Estado !== "string" ||
      !ESTADOS_VALIDOS.includes(body.Estado as Estado)
    ) {
      errores.Estado = "Estado debe ser 'Activo' o 'Inactivo'";
    } else {
      estadoFinal = body.Estado as Estado;
    }
  }

  let imagenFinal: string | null = null;
  if (body.Imagen !== undefined && body.Imagen !== null && body.Imagen !== "") {
    if (typeof body.Imagen !== "string" || !IMAGEN_RE.test(body.Imagen)) {
      errores.Imagen =
        "Imagen debe ser una ruta tipo /img/Servicios/<uuid>.ext o /uploads/servicios/<uuid>.ext";
    } else {
      imagenFinal = body.Imagen;
    }
  }

  return {
    errores,
    datos: {
      Nombre: nombreRaw,
      Descripcion: descRaw,
      Precio: Number.isFinite(precioNum) ? precioNum.toFixed(2) : "0.00",
      Estado: estadoFinal,
      Imagen: imagenFinal,
    },
  };
}

export async function listar(ctx: Context): Promise<void> {
  try {
    const scope = await obtenerInmobiliariaScope(ctx);
    const estado = ctx.request.url.searchParams.get("estado") ?? undefined;
    const q = ctx.request.url.searchParams.get("q") ?? undefined;

    if (estado && !ESTADOS_VALIDOS.includes(estado as Estado)) {
      responderError(ctx, 422, "Parámetros inválidos", {
        estado: "Debe ser 'Activo' o 'Inactivo'",
      });
      return;
    }

    const data = await Model.listarServicios({
      inmobiliariaId: scope.inmobiliariaId,
      estado,
      q,
    });
    responderOk(ctx, data, "Servicios listados correctamente");
  } catch (e) {
    manejarError(ctx, e);
  }
}

export async function detalle(ctx: Context): Promise<void> {
  try {
    const scope = await obtenerInmobiliariaScope(ctx);
    const id = parseId(paramId(ctx));
    if (!id) {
      responderError(ctx, 422, "ID inválido");
      return;
    }

    const servicio = await Model.obtenerServicio(id, scope.inmobiliariaId);
    if (!servicio) {
      responderError(ctx, 404, "Servicio no encontrado");
      return;
    }
    responderOk(ctx, servicio, "Servicio obtenido correctamente");
  } catch (e) {
    manejarError(ctx, e);
  }
}

export async function crear(ctx: Context): Promise<void> {
  try {
    const scope = await obtenerInmobiliariaScope(ctx);
    const body = await leerJson(ctx);
    if (!body) {
      responderError(ctx, 422, "Cuerpo JSON inválido");
      return;
    }

    const { errores, datos } = validarPayload(body);
    if (Object.keys(errores).length > 0) {
      responderError(ctx, 422, "Datos inválidos", errores);
      return;
    }

    const duplicado = await Model.existeNombreEnInmobiliaria(
      datos.Nombre,
      scope.inmobiliariaId,
    );
    if (duplicado) {
      responderError(ctx, 409, "Ya existe un servicio con ese Nombre en tu inmobiliaria");
      return;
    }

    const nuevoId = await Model.crearServicio({
      InmobiliariaID: scope.inmobiliariaId,
      Nombre: datos.Nombre,
      Descripcion: datos.Descripcion,
      Precio: datos.Precio,
      Estado: datos.Estado,
      Imagen: datos.Imagen,
    });

    const creado = await Model.obtenerServicio(nuevoId, scope.inmobiliariaId);
    responderOk(ctx, creado, "Servicio creado correctamente", 201);
  } catch (e) {
    manejarError(ctx, e);
  }
}

export async function actualizar(ctx: Context): Promise<void> {
  try {
    const scope = await obtenerInmobiliariaScope(ctx);
    const id = parseId(paramId(ctx));
    if (!id) {
      responderError(ctx, 422, "ID inválido");
      return;
    }

    const existente = await Model.obtenerServicio(id, scope.inmobiliariaId);
    if (!existente) {
      responderError(ctx, 404, "Servicio no encontrado");
      return;
    }

    const body = await leerJson(ctx);
    if (!body) {
      responderError(ctx, 422, "Cuerpo JSON inválido");
      return;
    }

    const { errores, datos } = validarPayload(body);
    if (Object.keys(errores).length > 0) {
      responderError(ctx, 422, "Datos inválidos", errores);
      return;
    }

    const duplicado = await Model.existeNombreEnInmobiliaria(
      datos.Nombre,
      scope.inmobiliariaId,
      id,
    );
    if (duplicado) {
      responderError(ctx, 409, "Ya existe otro servicio con ese Nombre en tu inmobiliaria");
      return;
    }

    await Model.actualizarServicio(id, scope.inmobiliariaId, {
      Nombre: datos.Nombre,
      Descripcion: datos.Descripcion,
      Precio: datos.Precio,
      Estado: datos.Estado,
      Imagen: datos.Imagen ?? existente.Imagen,
    });

    const actualizado = await Model.obtenerServicio(id, scope.inmobiliariaId);
    responderOk(ctx, actualizado, "Servicio actualizado correctamente");
  } catch (e) {
    manejarError(ctx, e);
  }
}

export async function cambiarEstado(ctx: Context): Promise<void> {
  try {
    const scope = await obtenerInmobiliariaScope(ctx);
    const id = parseId(paramId(ctx));
    if (!id) {
      responderError(ctx, 422, "ID inválido");
      return;
    }

    const body = await leerJson(ctx);
    if (!body) {
      responderError(ctx, 422, "Cuerpo JSON inválido");
      return;
    }

    const estado = body.Estado ?? body.estado;
    if (typeof estado !== "string" || !ESTADOS_VALIDOS.includes(estado as Estado)) {
      responderError(ctx, 422, "Datos inválidos", {
        estado: "Debe ser 'Activo' o 'Inactivo'",
      });
      return;
    }

    const existente = await Model.obtenerServicio(id, scope.inmobiliariaId);
    if (!existente) {
      responderError(ctx, 404, "Servicio no encontrado");
      return;
    }

    await Model.cambiarEstadoServicio(id, scope.inmobiliariaId, estado as Estado);
    const actualizado = await Model.obtenerServicio(id, scope.inmobiliariaId);
    responderOk(ctx, actualizado, "Estado actualizado correctamente");
  } catch (e) {
    manejarError(ctx, e);
  }
}

export async function eliminar(ctx: Context): Promise<void> {
  try {
    const scope = await obtenerInmobiliariaScope(ctx);
    const id = parseId(paramId(ctx));
    if (!id) {
      responderError(ctx, 422, "ID inválido");
      return;
    }

    const existente = await Model.obtenerServicio(id, scope.inmobiliariaId);
    if (!existente) {
      responderError(ctx, 404, "Servicio no encontrado");
      return;
    }

    const totalSolicitudes = await Model.contarSolicitudesDeServicio(id);
    if (totalSolicitudes > 0) {
      responderError(
        ctx,
        409,
        "No se puede eliminar: el servicio tiene solicitudes asociadas. Considera desactivarlo en su lugar.",
      );
      return;
    }

    await Model.eliminarServicio(id, scope.inmobiliariaId);
    responderOk(ctx, { ServicioID: id }, "Servicio eliminado correctamente");
  } catch (e) {
    manejarError(ctx, e);
  }
}

export async function subirImagen(ctx: Context): Promise<void> {
  try {
    await obtenerInmobiliariaScope(ctx);

    let form: FormData;
    try {
      form = await ctx.request.body.formData();
    } catch {
      responderError(ctx, 422, "Cuerpo multipart inválido. Envía FormData con el campo 'imagen'.");
      return;
    }

    const archivo = form.get("imagen");
    if (!(archivo instanceof File)) {
      responderError(ctx, 400, "Debes enviar un archivo en el campo 'imagen'");
      return;
    }

    const resultado = await guardarImagen(archivo, "servicios");
    if (!resultado.ok || !resultado.url) {
      responderError(ctx, 400, resultado.error ?? "No se pudo guardar la imagen");
      return;
    }

    responderOk(ctx, { url: resultado.url }, "Imagen subida correctamente", 201);
  } catch (e) {
    manejarError(ctx, e);
  }
}
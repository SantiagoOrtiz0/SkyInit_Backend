import type { Context } from "../Dependencies/dependencias.ts";
import {
  obtenerInmobiliariaScope,
  ScopeError,
} from "../Middlewares/inmobiliariasScope.ts";
import * as Model from "../Model/solicitudesInmobiliariaModel.ts";
import {
  ESTADOS_SOLICITUD,
  type EstadoSolicitud,
} from "../Model/solicitudesInmobiliariaModel.ts";
import { enviarCorreoEstadoSolicitud } from "../services/emailServices.ts";

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
  console.error("[solicitudesInmobiliaria] Error:", (e as Error)?.message);
  responderError(ctx, 500, "Error interno del servidor");
}

function paramId(ctx: Context): string | undefined {
  return (ctx as unknown as { params?: { id?: string } }).params?.id;
}

const MAX_ESTADO_LEN = 50;

interface QueryValidada {
  estado?: string;
  servicioId?: number;
  page: number;
  limit: number;
}

function validarQuery(url: URL): {
  errores: Record<string, string>;
  datos: QueryValidada;
} {
  const errores: Record<string, string> = {};
  const datos: QueryValidada = { page: 1, limit: 20 };

  const estadoRaw = url.searchParams.get("estado");
  if (estadoRaw !== null && estadoRaw !== "") {
    const v = estadoRaw.trim();
    if (v.length === 0 || v.length > MAX_ESTADO_LEN) {
      errores.estado =
        `estado debe tener entre 1 y ${MAX_ESTADO_LEN} caracteres`;
    } else {
      datos.estado = v;
    }
  }

  const servicioIdRaw = url.searchParams.get("servicioId");
  if (servicioIdRaw !== null && servicioIdRaw !== "") {
    const n = Number(servicioIdRaw);
    if (!Number.isInteger(n) || n <= 0) {
      errores.servicioId = "servicioId debe ser un entero positivo";
    } else {
      datos.servicioId = n;
    }
  }

  const pageRaw = url.searchParams.get("page");
  if (pageRaw !== null && pageRaw !== "") {
    const n = Number(pageRaw);
    if (!Number.isInteger(n) || n <= 0) {
      errores.page = "page debe ser un entero positivo";
    } else {
      datos.page = n;
    }
  }

  const limitRaw = url.searchParams.get("limit");
  if (limitRaw !== null && limitRaw !== "") {
    const n = Number(limitRaw);
    if (!Number.isInteger(n) || n <= 0 || n > 100) {
      errores.limit = "limit debe ser un entero entre 1 y 100";
    } else {
      datos.limit = n;
    }
  }

  return { errores, datos };
}

export async function listar(ctx: Context): Promise<void> {
  try {
    const scope = await obtenerInmobiliariaScope(ctx);
    const { errores, datos } = validarQuery(ctx.request.url);
    if (Object.keys(errores).length > 0) {
      responderError(ctx, 422, "Parámetros inválidos", errores);
      return;
    }
    const resultado = await Model.listarSolicitudes({
      inmobiliariaId: scope.inmobiliariaId,
      estado: datos.estado,
      servicioId: datos.servicioId,
      page: datos.page,
      limit: datos.limit,
    });
    responderOk(ctx, resultado, "Solicitudes listadas correctamente");
  } catch (e) {
    manejarError(ctx, e);
  }
}

export async function cambiarEstado(ctx: Context): Promise<void> {
  try {
    const scope = await obtenerInmobiliariaScope(ctx);
    const solicitudId = Number(paramId(ctx));
    if (!Number.isInteger(solicitudId) || solicitudId <= 0) {
      responderError(ctx, 422, "Solicitud inválida");
      return;
    }

    let body: { estado?: string; notas?: string | null } | null = null;
    try {
      body = (await ctx.request.body.json()) as {
        estado?: string;
        notas?: string | null;
      };
    } catch {
      body = null;
    }

    const estado = body?.estado?.trim() ?? "";
    if (!ESTADOS_SOLICITUD.includes(estado as EstadoSolicitud)) {
      responderError(ctx, 422, "Estado no permitido", {
        estado: "Usa: aun no aceptada, aceptada, en proceso o finalizado",
      });
      return;
    }

    let notas: string | null | undefined = undefined;
    if (body && "notas" in body) {
      const n = body.notas;
      if (n === null || n === "") {
        notas = null;
      } else if (typeof n === "string") {
        if (n.length > 2000) {
          responderError(ctx, 422, "Notas demasiado largas", {
            notas: "Máximo 2000 caracteres",
          });
          return;
        }
        notas = n.trim();
      }
    }

    const actualizada = await Model.actualizarEstadoSolicitud(
      scope.inmobiliariaId,
      solicitudId,
      estado as EstadoSolicitud,
      notas,
    );

    if (!actualizada) {
      responderError(
        ctx,
        404,
        "Solicitud no encontrada para esta inmobiliaria o estado inexistente en catálogo",
      );
      return;
    }

    let correoEnviado = false;
    const correo = actualizada.Correo;
    if (correo) {
      try {
        await enviarCorreoEstadoSolicitud(
          correo,
          actualizada.Usuario,
          actualizada.Servicio,
          actualizada.Estado ?? estado,
          actualizada.SolicitudID,
        );
        correoEnviado = true;
      } catch (error) {
        console.error(
          "[solicitudesInmobiliaria] SMTP:",
          (error as Error)?.message,
        );
      }
    }

    const { Correo: _c, ...publico } = actualizada;
    responderOk(
      ctx,
      { ...publico, correoEnviado },
      correoEnviado
        ? "Estado actualizado y correo enviado"
        : "Estado actualizado, pero el correo no se pudo enviar",
    );
  } catch (e) {
    manejarError(ctx, e);
  }
}

export async function eliminar(ctx: Context): Promise<void> {
  try {
    const scope = await obtenerInmobiliariaScope(ctx);
    const solicitudId = Number(paramId(ctx));
    if (!Number.isInteger(solicitudId) || solicitudId <= 0) {
      responderError(ctx, 422, "Solicitud inválida");
      return;
    }

    const ok = await Model.eliminarSolicitud(
      scope.inmobiliariaId,
      solicitudId,
    );
    if (!ok) {
      responderError(
        ctx,
        404,
        "Solicitud no encontrada para esta inmobiliaria",
      );
      return;
    }

    responderOk(ctx, { SolicitudID: solicitudId }, "Solicitud eliminada");
  } catch (e) {
    manejarError(ctx, e);
  }
}
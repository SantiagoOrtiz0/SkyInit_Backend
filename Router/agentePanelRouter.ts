/**
 * agentePanelRouter.ts
 * ─────────────────────────────────────────────────────────────────
 * Router del panel del agente — sección Propiedades.
 *
 * Todos los endpoints bajo /api/agente/panel/ requieren:
 *   1. authMiddleware     → verifica cookie skyinit_token y pone ctx.state.user
 *   2. rolMiddleware      → restringe a rol "Agente"
 *   3. agenteScopeMiddleware → confirma cuenta activa e inyecta ctx.state.agenteID
 *
 * El triple middleware garantiza que:
 *   - Sin sesión          → 401
 *   - Rol incorrecto      → 403 (Admin, Usuario, Constructora no pasan)
 *   - Cuenta inactiva     → 403
 *   - Propiedad ajena     → 403 (validado en el controller/model)
 * ─────────────────────────────────────────────────────────────────
 */
import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware, rolMiddleware } from "../Middlewares/validarJWT.ts";
import { agenteScopeMiddleware } from "../Middlewares/agenteScope.ts";
import {
  listarMisPropiedades,
  verDetallePropiedad,
  crearMiPropiedad,
  editarMiPropiedad,
  eliminarMiPropiedad,
  subirImagenMiPropiedad,
  eliminarImagenMiPropiedad,
} from "../Controller/agentePanelController.ts";

const agentePanelRouter = new Router();

// Stack de middlewares compartido para todas las rutas del panel
const guardarAcceso = [authMiddleware, rolMiddleware("Agente"), agenteScopeMiddleware] as const;

// ── Propiedades ──────────────────────────────────────────────────

/**
 * GET /api/agente/panel/propiedades
 * Lista todas las propiedades publicadas por el agente autenticado.
 *
 * Respuesta 200:
 * {
 *   success: true,
 *   total: number,
 *   data: Propiedad[]
 * }
 */
agentePanelRouter.get(
  "/api/agente/panel/propiedades",
  ...guardarAcceso,
  listarMisPropiedades,
);

/**
 * GET /api/agente/panel/propiedades/:id
 * Detalle completo de una propiedad propia (incluye imágenes y constructora).
 *
 * Respuesta 200: { success: true, data: PropiedadDetalle }
 * Respuesta 403: propiedad existe pero no pertenece al agente
 * Respuesta 404: propiedad no existe
 */
agentePanelRouter.get(
  "/api/agente/panel/propiedades/:id",
  ...guardarAcceso,
  verDetallePropiedad,
);

/**
 * POST /api/agente/panel/propiedades
 * Crea una nueva propiedad asignada al agente autenticado.
 *
 * Body JSON:
 * {
 *   titulo:          string   (requerido)
 *   precio:          number   (requerido, positivo)
 *   tipoOperacionID: number   (requerido, FK tiposoperacion)
 *   direccion:       string   (requerido)
 *   descripcion?:    string
 *   habitaciones?:   number
 *   ciudad?:         string
 *   constructoraID?: number
 *   estado?:         "Disponible"|"Reservada"|"En mantenimiento"|"Fuera del mercado"
 *   destacada?:      boolean
 * }
 *
 * Respuesta 201: { success: true, message: string }
 */
agentePanelRouter.post(
  "/api/agente/panel/propiedades",
  ...guardarAcceso,
  crearMiPropiedad,
);

/**
 * PUT /api/agente/panel/propiedades/:id
 * Actualiza una propiedad propia. Mismos campos que POST.
 * El agenteID NO puede cambiarse desde el body.
 *
 * Respuesta 200: { success: true, message: string }
 * Respuesta 403: propiedad ajena
 * Respuesta 404: propiedad no existe
 */
agentePanelRouter.put(
  "/api/agente/panel/propiedades/:id",
  ...guardarAcceso,
  editarMiPropiedad,
);

/**
 * DELETE /api/agente/panel/propiedades/:id
 * Elimina una propiedad propia. Cascade en BD limpia imágenes, favoritos,
 * agendas, comentarios y calificaciones.
 *
 * Respuesta 200: { success: true, message: string }
 * Respuesta 403: propiedad ajena
 * Respuesta 404: propiedad no existe
 */
agentePanelRouter.delete(
  "/api/agente/panel/propiedades/:id",
  ...guardarAcceso,
  eliminarMiPropiedad,
);

// ── Imágenes de propiedades ──────────────────────────────────────

/**
 * POST /api/agente/panel/propiedades/:id/imagenes
 * Sube una imagen a una propiedad propia.
 * Content-Type: multipart/form-data
 * Campo:        imagen (File)
 *
 * Respuesta 201: { success: true, message: string, data: { imagenID, url } }
 */
agentePanelRouter.post(
  "/api/agente/panel/propiedades/:id/imagenes",
  ...guardarAcceso,
  subirImagenMiPropiedad,
);

/**
 * DELETE /api/agente/panel/propiedades/:id/imagenes/:imgId
 * Elimina una imagen específica de una propiedad propia.
 *
 * Respuesta 200: { success: true, message: string }
 * Respuesta 404: imagen no encontrada en esa propiedad
 */
agentePanelRouter.delete(
  "/api/agente/panel/propiedades/:id/imagenes/:imgId",
  ...guardarAcceso,
  eliminarImagenMiPropiedad,
);

export { agentePanelRouter };

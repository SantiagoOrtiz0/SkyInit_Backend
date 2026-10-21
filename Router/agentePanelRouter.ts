
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
  listarMisProyectos,
  editarMiProyecto,
  verDetalleProyecto,
  subirImagenMiProyecto,
  eliminarImagenMiProyecto,
  verMiPerfil,
  actualizarMiPerfil,
  subirFotoMiPerfil,
} from "../Controller/agentePanelController.ts";

const agentePanelRouter = new Router();

// Stack de middlewares compartido para todas las rutas del panel
const guardarAcceso = [authMiddleware, rolMiddleware("Agente"), agenteScopeMiddleware] as const;

// ── Propiedades ──────────────────────────────────────────────────

agentePanelRouter.get(
  "/api/agente/panel/propiedades",
  ...guardarAcceso,
  listarMisPropiedades,
);


agentePanelRouter.get(
  "/api/agente/panel/propiedades/:id",
  ...guardarAcceso,
  verDetallePropiedad,
);


agentePanelRouter.post(
  "/api/agente/panel/propiedades",
  ...guardarAcceso,
  crearMiPropiedad,
);


agentePanelRouter.put(
  "/api/agente/panel/propiedades/:id",
  ...guardarAcceso,
  editarMiPropiedad,
);


agentePanelRouter.delete(
  "/api/agente/panel/propiedades/:id",
  ...guardarAcceso,
  eliminarMiPropiedad,
);


agentePanelRouter.post(
  "/api/agente/panel/propiedades/:id/imagenes",
  ...guardarAcceso,
  subirImagenMiPropiedad,
);


agentePanelRouter.delete(
  "/api/agente/panel/propiedades/:id/imagenes/:imgId",
  ...guardarAcceso,
  eliminarImagenMiPropiedad,
);

// --Proyectos ---------------------
agentePanelRouter
  .get("/api/agente/panel/proyectos", ...guardarAcceso, listarMisProyectos)
  .get("/api/agente/panel/proyectos/:id", ...guardarAcceso, verDetalleProyecto)
  .put("/api/agente/panel/proyectos/:id", ...guardarAcceso, editarMiProyecto)
  .post("/api/agente/panel/proyectos/:id/imagenes", ...guardarAcceso, subirImagenMiProyecto)
  .delete("/api/agente/panel/proyectos/:id/imagenes/:imagenId", ...guardarAcceso, eliminarImagenMiProyecto);

agentePanelRouter
  .get("/api/agente/panel/perfil", ...guardarAcceso, verMiPerfil)
  .put("/api/agente/panel/perfil", ...guardarAcceso, actualizarMiPerfil)
  .post("/api/agente/panel/perfil/foto", ...guardarAcceso, subirFotoMiPerfil);

export { agentePanelRouter };

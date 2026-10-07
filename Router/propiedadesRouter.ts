import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware, rolMiddleware } from "../Middlewares/validarJWT.ts";
import { listarPropiedades,listarDestacadas, listarPorAgente, consultarPropiedad, consultarPropiedadDetalle , listarSimilares, crearPropiedad, editarPropiedad, eliminarPropiedad, postImagenPropiedad, deleteImagenPropiedad, listarAgentes, ListarPropiedadesAdmin } from "../Controller/propiedadesController.ts";

const propiedadesRouter = new Router();

// Rutas publicas 
propiedadesRouter.get("/api/propiedades", listarPropiedades);
propiedadesRouter.get("/api/propiedades/destacadas", listarDestacadas);
propiedadesRouter.get("/api/propiedades/agente/:agenteID", listarPorAgente);
propiedadesRouter.get("/api/propiedades/:id/similares", listarSimilares);
propiedadesRouter.get("/api/propiedades/:id", consultarPropiedad);

// Nueva ruta autenticada
propiedadesRouter.get("/api/propiedades/:id/detalle", authMiddleware, consultarPropiedadDetalle);

//Rutas privadas (Agente y administrador)
propiedadesRouter.get("/api/propiedades/admin/listado", authMiddleware, rolMiddleware("Administrador", "SuperAdmin"), ListarPropiedadesAdmin);
propiedadesRouter.get("/api/propiedades/admin/agentes", authMiddleware, rolMiddleware("Administrador", "SuperAdmin"), listarAgentes);
propiedadesRouter.post("/api/propiedades",authMiddleware,rolMiddleware("Agente","Administrador"),crearPropiedad);
propiedadesRouter.put("/api/propiedades/:id",authMiddleware,rolMiddleware("Agente", "Administrador"),editarPropiedad);
propiedadesRouter.delete("/api/propiedades/:id",authMiddleware,rolMiddleware("Agente", "Administrador"),eliminarPropiedad);

propiedadesRouter.post("/api/propiedades/:id/imagenes", authMiddleware, rolMiddleware("Agente", "Constructora", "Administrador"), postImagenPropiedad);
propiedadesRouter.delete("/api/propiedades/:id/imagenes/:imagenId", authMiddleware,rolMiddleware("Agente","Constructora","Administrador"), deleteImagenPropiedad);

export default propiedadesRouter;
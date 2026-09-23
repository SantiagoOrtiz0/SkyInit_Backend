import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware, rolMiddleware } from "../Middlewares/validarJWT.ts";
import { listarPropiedades,listarDestacadas, listarPorAgente, consultarPropiedad, listarSimilares, crearPropiedad, editarPropiedad, eliminarPropiedad } from "../Controller/propiedadesController.ts";

const propiedadesRouter = new Router();

// Rutas publicas 
propiedadesRouter.get("/api/propiedades", listarPropiedades);
propiedadesRouter.get("/api/propiedades/destacadas", listarDestacadas);
propiedadesRouter.get("/api/propiedades/agente/:agenteID", listarPorAgente);
propiedadesRouter.get("/api/propiedades/:id/similares", listarSimilares);
propiedadesRouter.get("/api/propiedades/:id", consultarPropiedad);

//Rutas privadas (Agente y administrador)
propiedadesRouter.post("/api/propiedades",authMiddleware,rolMiddleware("Agente","Administrador"),crearPropiedad);
propiedadesRouter.put("/api/propiedades/:id",authMiddleware,rolMiddleware("Agente", "Administrador"),editarPropiedad);
propiedadesRouter.delete("/api/propiedades/:id",authMiddleware,rolMiddleware("Agente", "Administrador"),eliminarPropiedad);

export default propiedadesRouter;
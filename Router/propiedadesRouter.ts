import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware, rolMiddleware } from "../Middlewares/validarJWT.ts";
import { listarPropiedades,listarDestacadas, listarPorAgente, consultarPropiedad, consultarPropiedadDetalle , listarSimilares, crearPropiedad, editarPropiedad, eliminarPropiedad, postImagenPropiedad, deleteImagenPropiedad, listarAgentes, ListarPropiedadesAdmin, listarPropiedadesInmobiliaria } from "../Controller/propiedadesController.ts";
const propiedadesRouter = new Router();

// Rutas publicas 
propiedadesRouter.get("/api/propiedades", listarPropiedades);
propiedadesRouter.get("/api/propiedades/destacadas", listarDestacadas);


// Rutas administrativas
propiedadesRouter.get("/api/propiedades/admin/listado", authMiddleware, rolMiddleware("Administrador", "SuperAdmin"), ListarPropiedadesAdmin);
propiedadesRouter.get("/api/propiedades/admin/agentes", authMiddleware, rolMiddleware("Administrador", "SuperAdmin"), listarAgentes);


// Rutas dinamicas
propiedadesRouter.get("/api/propiedades/agente/:agenteID", listarPorAgente);
propiedadesRouter.get("/api/propiedades/:id/similares", listarSimilares);
propiedadesRouter.get("/api/propiedades/:id/detalle", authMiddleware, consultarPropiedadDetalle);
propiedadesRouter.get("/api/propiedades/:id", consultarPropiedad);


//Rutas privadas (Agente y administrador)

propiedadesRouter.post("/api/propiedades",authMiddleware,rolMiddleware("Agente","Administrador"),crearPropiedad);
propiedadesRouter.put("/api/propiedades/:id",authMiddleware,rolMiddleware("Agente", "Administrador"),editarPropiedad);
propiedadesRouter.delete("/api/propiedades/:id",authMiddleware,rolMiddleware("Agente", "Administrador"),eliminarPropiedad);

propiedadesRouter.post("/api/propiedades/:id/imagenes", authMiddleware, rolMiddleware("Agente", "Constructora", "Administrador"), postImagenPropiedad);
propiedadesRouter.delete("/api/propiedades/:id/imagenes/:imagenId", authMiddleware,rolMiddleware("Agente","Constructora","Administrador"), deleteImagenPropiedad);


// Panel inmobiliaria - solo propiedades de la inmobiliaria del admin logueado
propiedadesRouter.get("/api/propiedades/inmobiliaria/mis-propiedades", authMiddleware, rolMiddleware("Administrador"), listarPropiedadesInmobiliaria);
export default propiedadesRouter;
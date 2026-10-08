import { Router } from "../Dependencies/dependencias.ts";
import { listarProyectos, listarPorConstructora, consultarProyecto, listarSimilares, listarAvances, crearProyecto, editarProyecto, registrarAvance, eliminarProyecto, subirImagenProyecto } from "../Controller/proyectosController.ts";
import { authMiddleware, rolMiddleware } from "../Middlewares/validarJWT.ts";
import { constructoraScopeMiddleware } from "../Middlewares/constructoraScope.ts";
import { obtenerInmobiliariaScope } from "../Middlewares/inmobiliariasScope.ts";

// Middleware puente que inyecta inmobiliariaID en ctx.state
const inyectarScope = async (ctx: any, next: any) => {
    const scope = await obtenerInmobiliariaScope(ctx);
    ctx.state.inmobiliariaID = scope.inmobiliariaId;
    await next();
};

const proyectosRouter = new Router();

//Rutas publicas
proyectosRouter.get("/proyectos",listarProyectos);
proyectosRouter.get("/proyectos/constructora/:constructoraID", listarPorConstructora);
proyectosRouter.get("/proyectos/:id", consultarProyecto);
proyectosRouter.get("/proyectos/:id/similares", listarSimilares);
proyectosRouter.get("/proyectos/:id/avances", listarAvances);

//Rutas privadas (Constructora y administrador)
proyectosRouter.post("/proyectos", authMiddleware, rolMiddleware("Administrador"), inyectarScope, crearProyecto);
proyectosRouter.put("/proyectos/:id", authMiddleware, rolMiddleware("Administrador"), inyectarScope, editarProyecto);
proyectosRouter.delete("/proyectos/:id", authMiddleware,rolMiddleware ("Administrador"), eliminarProyecto);
proyectosRouter.post("/proyectos/:id/imagenes", authMiddleware, rolMiddleware ("Administrador"), subirImagenProyecto);

// Ruta privada solo para constructora
proyectosRouter.post("/proyectos/:id/avances", authMiddleware,rolMiddleware ("Constructora"), constructoraScopeMiddleware, registrarAvance);

export default proyectosRouter;
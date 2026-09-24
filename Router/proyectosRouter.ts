import { Router } from "../Dependencies/dependencias.ts";
import { listarProyectos, listarPorConstructora, consultarProyecto, listarSimilares, listarAvances, crearProyecto, editarProyecto, registrarAvance, eliminarProyecto } from "../Controller/proyectosController.ts";
import { authMiddleware, rolMiddleware } from "../Middlewares/validarJWT.ts";

const proyectosRouter = new Router();

//Rutas publicas
proyectosRouter.get("/proyectos",listarProyectos);
proyectosRouter.get("/proyectos/constructora/:constructoraID", listarPorConstructora);
proyectosRouter.get("/proyectos/:id", consultarProyecto);
proyectosRouter.get("/proyectos/:id/similares", listarSimilares);
proyectosRouter.get("/proyectos/:id/avances", listarAvances);

//Rutas privadas (Constructora y administrador)
proyectosRouter.post("/proyectos", authMiddleware,rolMiddleware ("Constructora", "Administrador"), crearProyecto );
proyectosRouter.put("/proyectos/:id", authMiddleware,rolMiddleware ("Constructora", "Administrador"), editarProyecto);
proyectosRouter.delete("/proyectos/:id", authMiddleware,rolMiddleware ("Constructora", "Administrador"), eliminarProyecto);

// Ruta privada solo para constructora
proyectosRouter.post("/proyectos/:id/avances", authMiddleware,rolMiddleware ("Constructora"), registrarAvance);

export default proyectosRouter;
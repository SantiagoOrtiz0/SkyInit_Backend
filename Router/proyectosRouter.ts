import { Router } from "../Dependencies/dependencias.ts";
import { listarProyectos, listarPorConstructora, consultarProyecto, listarSimilares, listarAvances, crearProyecto, editarProyecto, registrarAvance, eliminarProyecto } from "../Controller/proyectosController.ts";

const proyectosRouter = new Router();

//Rutas publicas
proyectosRouter.get("/proyectos",listarProyectos);
proyectosRouter.get("/proyectos/constructora/:constructoraID", listarPorConstructora);
proyectosRouter.get("/proyectos/:id", consultarProyecto);
proyectosRouter.get("/proyectos/:id/similares", listarSimilares);
proyectosRouter.get("/proyectos/:id/avances", listarAvances);

//Rutas privadas (Constructora y administrador)
proyectosRouter.post("/proyectos", crearProyecto );
proyectosRouter.put("/proyectos/:id", editarProyecto);
proyectosRouter.delete("/proyectos/:id", eliminarProyecto);

// Ruta privada solo para constructora
proyectosRouter.post("/proyectos/:id/avances", registrarAvance);

export default proyectosRouter;
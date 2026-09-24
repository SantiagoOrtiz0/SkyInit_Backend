import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware, rolMiddleware } from "../Middlewares/validarJWT.ts";
import { constructoraScopeMiddleware } from "../Middlewares/constructoraScope.ts";
import {
    getDashboard,
    getPerfil,
    putPerfil,
    postLogo,
    getProyectos,
    getProyectoPorId,
    postProyecto,
    putProyecto,
    patchEstadoProyecto,
    deleteProyecto,
    postImagenProyecto,
    deleteImagenProyecto,
    postAvanceProyecto,
    getAvancesProyecto,
    getPropiedadesConstructora,
    getPropiedadConstructoraPorId,
    postPropiedadConstructora,
    putPropiedadConstructora,
    deletePropiedadConstructora,
} from "../Controller/constructoraPanelController.ts";

const constructoraPanelRouter = new Router();

// Todo lo que cuelga de /panel/constructora exige: JWT valido,
// rol Constructora, y que la cuenta tenga una constructora activa
// asociada (constructoraScopeMiddleware deja constructoraID en ctx.state)
const proteger = [authMiddleware, rolMiddleware("Constructora"), constructoraScopeMiddleware] as const;

// Dashboard (RF-293 / RF-294 resumen)
constructoraPanelRouter.get("/panel/constructora/dashboard", ...proteger, getDashboard);

// Perfil (RF-301 / RF-302)
constructoraPanelRouter
    .get("/panel/constructora/perfil", ...proteger, getPerfil)
    .put("/panel/constructora/perfil", ...proteger, putPerfil)
    .post("/panel/constructora/perfil/logo", ...proteger, postLogo);

// Proyectos (RF-294, RF-297)
constructoraPanelRouter
    .get("/panel/constructora/proyectos", ...proteger, getProyectos)
    .get("/panel/constructora/proyectos/:id", ...proteger, getProyectoPorId)
    .post("/panel/constructora/proyectos", ...proteger, postProyecto)
    .put("/panel/constructora/proyectos/:id", ...proteger, putProyecto)
    .patch("/panel/constructora/proyectos/:id/estado", ...proteger, patchEstadoProyecto)
    .delete("/panel/constructora/proyectos/:id", ...proteger, deleteProyecto);

// Imagenes de proyecto (RF-295 / RF-296)
constructoraPanelRouter
    .post("/panel/constructora/proyectos/:id/imagenes", ...proteger, postImagenProyecto)
    .delete("/panel/constructora/proyectos/:id/imagenes/:imagenId", ...proteger, deleteImagenProyecto);

// Avances de proyecto (RF-298 / RF-299 / RF-300)
constructoraPanelRouter
    .post("/panel/constructora/proyectos/:id/avances", ...proteger, postAvanceProyecto)
    .get("/panel/constructora/proyectos/:id/avances", ...proteger, getAvancesProyecto);

// Propiedades (RF-293)
constructoraPanelRouter
    .get("/panel/constructora/propiedades", ...proteger, getPropiedadesConstructora)
    .get("/panel/constructora/propiedades/:id", ...proteger, getPropiedadConstructoraPorId)
    .post("/panel/constructora/propiedades", ...proteger, postPropiedadConstructora)
    .put("/panel/constructora/propiedades/:id", ...proteger, putPropiedadConstructora)
    .delete("/panel/constructora/propiedades/:id", ...proteger, deletePropiedadConstructora);

export { constructoraPanelRouter };

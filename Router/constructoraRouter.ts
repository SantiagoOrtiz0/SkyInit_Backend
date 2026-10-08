import { Router } from "../Dependencies/dependencias.ts";
import {authMiddleware, rolMiddleware } from "../Middlewares/validarJWT.ts";
import { getConstructoras, getConstructorasporId, postConstructora, putConstructora, deleteConstructora, postVincularInmobiliaria, deleteDesvincularInmobiliaria } from "../Controller/constructoraController.ts";

const constructoraRouter = new Router();

constructoraRouter
    .get("/api/constructoras", getConstructorasPublicas)

    .get("/constructoras", authMiddleware, rolMiddleware("Administrador"), getConstructoras)
    .get("/constructoras/:id", authMiddleware, rolMiddleware("Administrador"), getConstructorasporId)
    .post("/constructoras", authMiddleware, rolMiddleware("Administrador"), postConstructora)
    .put("/constructoras/:id", authMiddleware, rolMiddleware("Administrador"), putConstructora)
    .delete("/constructoras/:id", authMiddleware, rolMiddleware("Administrador"), deleteConstructora)
    .post("/constructoras/:id/inmobiliarias", authMiddleware, rolMiddleware("Administrador"), postVincularInmobiliaria)
    .delete("/constructoras/:id/inmobiliarias", authMiddleware, rolMiddleware("Administrador"), deleteDesvincularInmobiliaria);

export {constructoraRouter};

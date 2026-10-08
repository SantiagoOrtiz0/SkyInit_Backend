import { Router } from "../Dependencies/dependencias.ts";
import {authMiddleware, rolMiddleware } from "../Middlewares/validarJWT.ts";
import { getConstructoras,getConstructorasporId,postConstructora,putConstructora, deleteConstructora, getConstructorasPublicas, getInmobiliarias } from "../Controller/constructoraController.ts";

const constructoraRouter = new Router();

constructoraRouter
    .get("/api/constructoras", getConstructorasPublicas)

    .get("/inmobiliarias", authMiddleware, rolMiddleware("Administrador"), getInmobiliarias)

    .get("/constructoras", authMiddleware, rolMiddleware("Administrador"), getConstructoras)
    .get("/constructoras/:id", authMiddleware, rolMiddleware("Administrador"), getConstructorasporId)
    .post("/constructoras", authMiddleware, rolMiddleware("Administrador"), postConstructora)
    .put("/constructoras/:id", authMiddleware, rolMiddleware("Administrador"), putConstructora)
    .delete("/constructoras/:id", authMiddleware, rolMiddleware("Administrador"), deleteConstructora);

export {constructoraRouter};

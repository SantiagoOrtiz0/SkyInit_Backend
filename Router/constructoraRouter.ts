import { Router } from "../Dependencies/dependencias.ts";
import { getConstructoras,getConstructorasporId,postConstructora,putConstructora, deleteConstructora } from "../Controller/constructoraController.ts";

const constructoraRouter = new Router();

constructoraRouter
    .get("/constructoras", getConstructoras)
    .get("/constructoras/:id", getConstructorasporId)
    .post("/constructoras", postConstructora)
    .put("/constructoras/:id", putConstructora)
    .delete("/constructoras/:id", deleteConstructora);

export {constructoraRouter};

import { Router } from "../Dependencies/dependencias.ts";
import { getTerminos, postAceptarTerminos, getEstadoTerminos } from "../Controller/terminosController.ts";
import { authMiddleware } from "../Middlewares/validarJWT.ts";

const terminosRouter = new Router();

terminosRouter.get("/terminos",          getTerminos);
terminosRouter.post("/terminos/aceptar", authMiddleware, postAceptarTerminos);
terminosRouter.get("/terminos/estado",   authMiddleware, getEstadoTerminos);

export default terminosRouter;
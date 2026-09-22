import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware } from "../Middlewares/validarJWT.ts";
import { getServicios } from "../Controller/serviciosController.ts";

const serviciosRouter = new Router();

serviciosRouter.get("/api/servicios", authMiddleware, getServicios);

export { serviciosRouter };

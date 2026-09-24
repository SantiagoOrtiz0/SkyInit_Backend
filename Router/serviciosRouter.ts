import { Router } from "../Dependencies/dependencias.ts";
import { getServicios } from "../Controller/serviciosController.ts";

const serviciosRouter = new Router();


serviciosRouter.get("/api/servicios", getServicios);


export { serviciosRouter };

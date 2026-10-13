import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware } from "../Middlewares/validarJWT.ts";
import * as Controller from "../Controller/solicitudesInmobiliariaController.ts";

export const solicitudesInmobiliariaRouter = new Router({
  prefix: "/api/inmobiliaria/solicitudes",
});

solicitudesInmobiliariaRouter.use(authMiddleware);

solicitudesInmobiliariaRouter.get("/", Controller.listar);
solicitudesInmobiliariaRouter.put("/:id/estado", Controller.cambiarEstado);
solicitudesInmobiliariaRouter.delete("/:id", Controller.eliminar);
import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware } from "../Middlewares/validarJWT.ts";
import * as Controller from "../Controller/serviciosInmobiliariaController.ts";
import { subirImagen } from "../Controller/serviciosInmobiliariaController.ts";

export const serviciosInmobiliariaRouter = new Router({
  prefix: "/api/inmobiliaria/servicios",
});

serviciosInmobiliariaRouter.use(authMiddleware);

serviciosInmobiliariaRouter
  .get("/", Controller.listar)
  .post("/", Controller.crear)
  .post("/imagen", subirImagen);

serviciosInmobiliariaRouter
  .get("/:id", Controller.detalle)
  .put("/:id", Controller.actualizar)
  .patch("/:id/estado", Controller.cambiarEstado)
  .delete("/:id", Controller.eliminar);

export default serviciosInmobiliariaRouter;
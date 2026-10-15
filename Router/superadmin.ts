import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware, rolMiddleware } from "../Middlewares/validarJWT.ts";
import {
  getUsuarios,
  getRoles,
  postUsuario,
  putUsuario,
  getInmobiliarias,
  getConstructorasSA,
  postConstructoraSA,
  putConstructoraSA
} from "../Controller/superadmincontroller.ts";
import {
    postInmobiliaria,
    putInmobiliaria,
    patchAsignarUsuarios,
} from "../Controller/inmobiliariasuperadminController.ts";

const superadminRouter = new Router();
const proteger = [authMiddleware, rolMiddleware("SuperAdmin")] as const;

superadminRouter
  .get("/superadmin/usuarios", ...proteger, getUsuarios)
  .post("/superadmin/usuarios", ...proteger, postUsuario)
  .put("/superadmin/usuarios/:id", ...proteger, putUsuario)
  .get("/superadmin/inmobiliarias", ...proteger, getInmobiliarias)
  .post("/superadmin/inmobiliarias", ...proteger, postInmobiliaria)
  .put("/superadmin/inmobiliarias/:id", ...proteger, putInmobiliaria)
  .get("/superadmin/roles", ...proteger, getRoles)
  .get("/superadmin/constructoras", ...proteger, getConstructorasSA)
  .post("/superadmin/constructoras", ...proteger, postConstructoraSA)
  .put("/superadmin/constructoras/:id", ...proteger, putConstructoraSA)
  .patch("/superadmin/inmobiliarias/:id/asignar", ...proteger, patchAsignarUsuarios);

export { superadminRouter };
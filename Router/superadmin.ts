import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware, rolMiddleware } from "../Middlewares/validarJWT.ts";
import {
  getUsuarios,
  getRoles,
  postUsuario,
  putUsuario,
  getInmobiliarias,
} from "../Controller/superadmincontroller.ts";

const superadminRouter = new Router();
const proteger = [authMiddleware, rolMiddleware("SuperAdmin")] as const;

superadminRouter
  .get("/superadmin/usuarios", ...proteger, getUsuarios)
  .post("/superadmin/usuarios", ...proteger, postUsuario)
  .put("/superadmin/usuarios/:id", ...proteger, putUsuario)
  .get("/superadmin/inmobiliarias", ...proteger, getInmobiliarias)
  .get("/superadmin/roles", ...proteger, getRoles);

export { superadminRouter };
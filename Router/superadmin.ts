import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware, rolMiddleware } from "../Middlewares/validarJWT.ts";
import {
    getUsuarios,
    getRoles,
    postUsuario,
    putUsuario,
} from "../Controller/superadmincontroller.ts";
import {
    getInmobiliarias,
    postInmobiliaria,
    putInmobiliaria,
    patchAsignarUsuarios,
} from "../Controller/inmobiliariasuperadminController.ts";

const superadminRouter = new Router();
const proteger = [authMiddleware, rolMiddleware("SuperAdmin")] as const;

superadminRouter
    .get("/superadmin/usuarios",                         ...proteger, getUsuarios)
    .post("/superadmin/usuarios",                        ...proteger, postUsuario)
    .put("/superadmin/usuarios/:id",                     ...proteger, putUsuario)
    .get("/superadmin/roles",                            ...proteger, getRoles)
    .get("/superadmin/inmobiliarias",                    ...proteger, getInmobiliarias)
    .post("/superadmin/inmobiliarias",                   ...proteger, postInmobiliaria)
    .put("/superadmin/inmobiliarias/:id",                ...proteger, putInmobiliaria)
    .patch("/superadmin/inmobiliarias/:id/asignar",      ...proteger, patchAsignarUsuarios);

export { superadminRouter };
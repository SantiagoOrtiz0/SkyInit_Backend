import { Router } from "../Dependencies/dependencias.ts";
import { obtenerDashboardAdmin } from "../Controller/dashboardController.ts";
import { authMiddleware, rolMiddleware } from "../Middlewares/validarJWT.ts";

const dashboardRouter = new Router();

dashboardRouter.get("/admin/dashboard", authMiddleware, rolMiddleware("Administrador"), obtenerDashboardAdmin,);

export default dashboardRouter;
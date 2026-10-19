import { Router } from "../Dependencies/dependencias.ts";
import { obtenerDashboardAdmin, obtenerDashboardAgente, obtenerDashboardSuperAdmin } from "../Controller/dashboardController.ts";
import { authMiddleware, rolMiddleware } from "../Middlewares/validarJWT.ts";

const dashboardRouter = new Router();

dashboardRouter.get("/admin/dashboard", authMiddleware, rolMiddleware("Administrador"), obtenerDashboardAdmin,);

dashboardRouter.get("/agente/dashboard", authMiddleware, rolMiddleware("Agente"),obtenerDashboardAgente,);

dashboardRouter.get("/superadmin/dashboard",authMiddleware,rolMiddleware("SuperAdmin"),obtenerDashboardSuperAdmin,)

export default dashboardRouter;
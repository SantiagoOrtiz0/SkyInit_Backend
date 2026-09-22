import { Router } from "../Dependencies/dependencias.ts";
import { registro, login, perfil, logout } from "../Controller/authController.ts";
import { authMiddleware } from "../Middlewares/validarJWT.ts";

const authRouter = new Router();

authRouter.post("/auth/registro", registro);
authRouter.post("/auth/login",    login);
authRouter.get("/auth/perfil",    authMiddleware, perfil);
authRouter.post("/auth/logout",   authMiddleware, logout);

export default authRouter;
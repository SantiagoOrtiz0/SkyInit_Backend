import { Router } from "../Dependencies/dependencias.ts";
import { registro, login, perfil, logout,olvidePassword,restablecerPassword } from "../Controller/authController.ts";
import { authMiddleware } from "../Middlewares/validarJWT.ts";

const authRouter = new Router();

authRouter.post("/auth/registro", registro);
authRouter.post("/auth/login",    login);
authRouter.get("/auth/perfil",    authMiddleware, perfil);
authRouter.post("/auth/logout", logout);

authRouter.post("/auth/olvide-password", olvidePassword);
authRouter.post("/auth/restablecer-password", restablecerPassword);

export default authRouter;
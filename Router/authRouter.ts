import { Router } from "../Dependencies/dependencias.ts";
import { registro, login, perfil, logout,olvidePassword,restablecerPassword, subirFotoPerfil, verificarCodigo } from "../Controller/authController.ts";
import { authMiddleware } from "../Middlewares/validarJWT.ts";
import { limitar } from "../Middlewares/rateLimit.ts";

const authRouter = new Router();

authRouter.post("/auth/registro", limitar("registro", 10, 3600), registro);
authRouter.post("/auth/login",    limitar("login", 10, 600), login);
authRouter.get("/auth/perfil",    authMiddleware, perfil);
authRouter.post("/auth/logout", logout);

authRouter.post("/auth/perfil/foto", authMiddleware, subirFotoPerfil);
authRouter.post("/auth/olvide-password", limitar("olvide", 5, 900), olvidePassword);
authRouter.post("/auth/verificar-codigo", limitar("codigo", 10, 900), verificarCodigo);
authRouter.post("/auth/restablecer-password", limitar("restablecer", 10, 900), restablecerPassword);

export default authRouter;
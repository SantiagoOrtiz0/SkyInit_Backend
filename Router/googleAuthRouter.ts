import { Router } from "../Dependencies/dependencias.ts";
import { googleLogin, googleCallback } from "../Controller/googleAuthController.ts";

const googleAuthRouter = new Router();

googleAuthRouter.get("/auth/google",          googleLogin);
googleAuthRouter.get("/auth/google/callback", googleCallback);

export default googleAuthRouter;
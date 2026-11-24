import { Router } from "../Dependencies/dependencias.ts";
import { googleLogin, googleCallback, googleCanjear } from "../Controller/googleAuthController.ts";

const googleAuthRouter = new Router();

googleAuthRouter.get("/auth/google",          googleLogin);
googleAuthRouter.get("/auth/google/callback", googleCallback);
googleAuthRouter.post("/auth/google/canjear", googleCanjear);

export default googleAuthRouter;
import { Router } from "../Dependencies/dependencias.ts";
import {
    getInmobiliariaPublica,
    getInmobiliariasPublicas,
} from "../Controller/inmobiliariaPublicaController.ts";

const inmobiliariaPublicaRouter = new Router();

// Listado y perfil publico de inmobiliarias (sin autenticacion)
inmobiliariaPublicaRouter.get("/api/inmobiliarias", getInmobiliariasPublicas);
inmobiliariaPublicaRouter.get("/api/inmobiliarias/:id", getInmobiliariaPublica);

export { inmobiliariaPublicaRouter };

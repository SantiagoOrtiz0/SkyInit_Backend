import { Router } from "../Dependencies/dependencias.ts";
import { getInmobiliariaPublica } from "../Controller/inmobiliariaPublicaController.ts";

const inmobiliariaPublicaRouter = new Router();

// Perfil publico de la inmobiliaria (sin autenticacion), usado desde el
// catalogo de servicios para mostrar quien ofrece cada servicio.
inmobiliariaPublicaRouter.get("/api/inmobiliarias/:id", getInmobiliariaPublica);

export { inmobiliariaPublicaRouter };

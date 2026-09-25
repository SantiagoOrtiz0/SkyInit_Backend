import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware } from "../Middlewares/validarJWT.ts";
import { getServicios, solicitarServicio } from "../Controller/serviciosController.ts";

const serviciosRouter = new Router();

// Catalogo publico de servicios de mantenimiento (agrupados por inmobiliaria)
// OJO: antes esta ruta exigia ":id" aunque el controller nunca lo usaba,
// lo que provocaba 404 al llamarla como "/api/servicios" desde el proxy Astro.
serviciosRouter.get("/api/servicios", getServicios);

// Solicitar un servicio de mantenimiento (requiere sesion activa)
serviciosRouter.post("/api/servicios/solicitar", authMiddleware, solicitarServicio);

export { serviciosRouter };

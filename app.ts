import { Application, oakCors } from "./Dependencies/dependencias.ts";
import { constructoraRouter } from "./Router/constructoraRouter.ts";
import { serviciosRouter } from "./Router/serviciosRouter.ts";
import authRouter    from "./Router/authRouter.ts";
import terminosRouter from "./Router/terminosRouter.ts";
import propiedadesRouter from "./Router/propiedadesRouter.ts";
import proyectosRouter from "./Router/proyectosRouter.ts";

const app = new Application();

app.use(oakCors({
    origin: "http://localhost:4321",
    credentials: true,   // necesario para que las cookies de sesión pasen
}));

// Registrar routers
const routes = [serviciosRouter,constructoraRouter,authRouter,terminosRouter,propiedadesRouter, proyectosRouter];

routes.forEach(router => {
    app.use(router.routes());
    app.use(router.allowedMethods());
});

console.log("Servidor corriendo por el puerto 8001");

app.listen({ port: 8001 });

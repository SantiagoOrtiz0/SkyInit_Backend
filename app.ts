import { Application, oakCors } from "./Dependencies/dependencias.ts";
import { constructoraRouter } from "./Router/constructoraRouter.ts";
import { serviciosRouter } from "./Router/serviciosRouter.ts";
import authRouter    from "./Router/authRouter.ts";
import terminosRouter from "./Router/terminosRouter.ts";

const app = new Application();

app.use(oakCors({
    origin: "*"
}));

// Registrar routers
const routes = [serviciosRouter];

const routes = [constructoraRouter];
routes.forEach(router => {
    app.use(router.routes());
    app.use(router.allowedMethods());
});

console.log("Servidor corriendo por el puerto 8001");

app.listen({ port: 8001 });

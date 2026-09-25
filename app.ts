import { Application, oakCors } from "./Dependencies/dependencias.ts";
import { constructoraRouter } from "./Router/constructoraRouter.ts";
import { serviciosRouter } from "./Router/serviciosRouter.ts";
import authRouter    from "./Router/authRouter.ts";
import terminosRouter from "./Router/terminosRouter.ts";
import propiedadesRouter from "./Router/propiedadesRouter.ts";
import proyectosRouter from "./Router/proyectosRouter.ts";
import { constructoraPanelRouter } from "./Router/constructoraPanelRouter.ts";
import { send } from "./Dependencies/dependencias.ts";

const app = new Application();

app.use(oakCors({
    origin: Deno.env.get("FRONTEND_URL") ?? "http://localhost:4321",
    credentials: true,   // necesario para que las cookies de sesión pasen
}));

app.use(async (ctx, next) => {
    if (ctx.request.url.pathname.startsWith("/uploads/")) {
        try {
        await send(ctx, ctx.request.url.pathname, {
            root: Deno.cwd(),
        });
        } catch {
        ctx.response.status = 404;
        ctx.response.body = { error: "Archivo no encontrado" };
        }
        return;
    }
    await next();
});

// Registrar routers
const routes = [serviciosRouter,constructoraRouter,authRouter,terminosRouter,propiedadesRouter, proyectosRouter,constructoraPanelRouter];

routes.forEach(router => {
    app.use(router.routes());
    app.use(router.allowedMethods());
});

console.log("Servidor corriendo por el puerto 8001");

app.listen({ port: 8001 });

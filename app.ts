import { Application, oakCors } from "./Dependencies/dependencias.ts";
import authRouter    from "./Router/authRouter.ts";
import terminosRouter from "./Router/terminosRouter.ts";

const app = new Application();

app.use(oakCors({
    origin: Deno.env.get("FRONTEND_URL") || "http://localhost:4321",
    credentials: true,
    allowedHeaders: ["Content-Type"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

// Rutas
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());

app.use(terminosRouter.routes());
app.use(terminosRouter.allowedMethods());

console.log("Servidor corriendo en el puerto 8001");
app.listen({ port: 8001 });
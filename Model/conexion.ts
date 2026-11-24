import { drizzle, mysql } from "../Dependencies/dependencias.ts";
import * as schema from "./schema.ts";

function requerida(nombre: string): string {
    const valor = Deno.env.get(nombre);
    if (!valor) {
        throw new Error(`Falta la variable de entorno ${nombre}. Revisa el archivo .env (ver .env.example).`);
    }
    return valor;
}

const pool = mysql.createPool({
    host: Deno.env.get("DB_HOST") ?? "127.0.0.1",
    port: Number(Deno.env.get("DB_PORT") ?? 3306),
    user: requerida("DB_USER"),
    password: requerida("DB_PASS"),
    database: Deno.env.get("DB_NAME") ?? "skyinit",
    connectionLimit: 10,
});
export const db = drizzle(pool, { schema, mode: "default"});

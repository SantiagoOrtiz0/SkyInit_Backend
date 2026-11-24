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
    host: (Deno.env.get("DB_HOST") ?? "127.0.0.1").trim(),
    port: Number((Deno.env.get("DB_PORT") ?? "3306").trim()),
    user: requerida("DB_USER").trim(),
    password: Deno.env.get("DB_PASS") ?? "",
    database: (Deno.env.get("DB_NAME") ?? "skyinit").trim(),
    connectionLimit: 10,
});
export const db = drizzle(pool, { schema, mode: "default"});

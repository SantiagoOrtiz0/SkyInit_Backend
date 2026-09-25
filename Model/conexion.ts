import { drizzle, mysql } from "../Dependencies/dependencias.ts";
import * as schema from "./schema.ts";


const pool = mysql.createPool({
    host: Deno.env.get("DB_HOST") ?? "localhost",
    user: Deno.env.get("DB_USER") ?? "root",
    database: Deno.env.get("DB_NAME") ?? "skyinit",
    password: Deno.env.get("DB_PASS") ?? "",
});
export const db = drizzle(pool, { schema, mode: "default"});

import { drizzle, mysql } from "../Dependencies/dependencias.ts";
import * as schema from "./schema.ts";

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    database: "skyinit",
    password: ""
})

export const db = drizzle(pool, { schema, mode: "default"});

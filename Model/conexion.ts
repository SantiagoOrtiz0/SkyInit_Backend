import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema.ts";

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    database: "skyinit",
    password: ""
})

export const db = drizzle(pool, { schema, mode: "default"});

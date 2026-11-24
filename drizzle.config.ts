import { defineConfig } from "npm:drizzle-kit";

export default defineConfig({
    dialect: "mysql",
    schema:  "./Model/schema.ts",
    dbCredentials: {
        host:     Deno.env.get("DB_HOST") ?? "127.0.0.1",
        port:     Number(Deno.env.get("DB_PORT") ?? 3306),
        user:     Deno.env.get("DB_USER") ?? "root",
        password: Deno.env.get("DB_PASS") ?? "",
        database: Deno.env.get("DB_NAME") ?? "skyinit",
    },
});
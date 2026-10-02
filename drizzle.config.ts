import { defineConfig } from "npm:drizzle-kit";

export default defineConfig({
    dialect: "mysql",
    schema:  "./Model/schema.ts",
    dbCredentials: {
        host:     Deno.env.get("DB_HOST") ?? "localhost",
        user:     Deno.env.get("DB_USER") ?? "root",
        password: Deno.env.get("DB_PASS") ?? "",
        database: Deno.env.get("DB_NAME") ?? "skyinit",
    },
});
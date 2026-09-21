import { Client } from "../Dependencies/dependencias.ts";

const client = new Client();

export async function conectar() {
    await client.connect({
        hostname: Deno.env.get("DB_HOST")  ||  "127.0.0.1",
        port: Number(Deno.env.get("DB_PORT"))  ||  3306,
        username: Deno.env.get("DB_USER")  ||  "root",
        password: Deno.env.get("DB_PASSWORD")  ||  "",
        db: Deno.env.get("DB_NAME")  ||  "skyinit",
    });
    return client;
}

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const db = await conectar();
    const result = await db.query(sql, params);
    return result as T[];
}

export async function execute(sql: string, params?: unknown[]): Promise <{affectedRows: number; lastInsertId: number}> {
    const db = await conectar();
    const result = await db.execute(sql, params);
    return {
        affectedRows: result.affectedRows ?? 0,
        lastInsertId: result.lastInsertId ?? 0,
    };
}
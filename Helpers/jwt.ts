import { create, getNumericDate, verify } from "../Dependencies/dependencias.ts";
import { generarKey } from "./CriptoKey.ts";
import { Context } from "../Dependencies/dependencias.ts";

const secret = Deno.env.get("SECRET_KEY") || "default_key";
const server = Deno.env.get("SERVER");
const IS_PROD = Deno.env.get("ENV") === "production";

const TOKEN_EXPIRY_SECONDS = 60 * 60;
export const COOKIE_NAME = "skyinit_token";

export const crearToken = async (userId: number, rol: string): Promise<string> => {
    const payload = {
        iss: server,
        sub: String(userId),
        rol: rol,
        jti: crypto.randomUUID(),
        exp: getNumericDate(TOKEN_EXPIRY_SECONDS),
    };
    const secretKey = await generarKey(secret);
    return await create({ alg: "HS256", typ: "JWT" }, payload, secretKey);
};

export const verificarToken = async (token: string) => {
    const secretKey = await generarKey(secret);
    try {
        return await verify(token, secretKey);
    } catch {
        return null;
    }
};

export function setTokenCookie(ctx: Context, token: string): void {
    ctx.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: "Strict",
        maxAge: TOKEN_EXPIRY_SECONDS,
        path: "/",
    });
}

export function clearTokenCookie(ctx: Context): void {
    ctx.cookies.delete(COOKIE_NAME, { path: "/" });
}

// Alias para compatibilidad con código existente
export const CrearToken = crearToken;
export const VerificarTokenAcceso = verificarToken;
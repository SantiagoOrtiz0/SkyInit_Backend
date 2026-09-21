import { create, getNumericDate, verify } from "../Dependencies/dependencias.ts";
import { generarKey } from "./CriptoKey.ts";

const secret = Deno.env.get("SECRET_KEY") || "default_key";
const server = Deno.env.get("SERVER");

export const CrearToken = async (userId: number, rol: string) => {
    const payload = {
        iss: server,
        sub: String(userId),
        rol: rol,
        jti: crypto.randomUUID(),
        exp: getNumericDate(60 * 60),
    };

    const secretKey = await generarKey(secret);
    return await create ({alg: "HS256", typ: "JWT"}, payload, secretKey);
};

export const VerificarTokenAcceso = async (token: string) => {
    const secretKey = await generarKey(secret);  //se verifica con la clave secreta
    try {
        return await verify(token, secretKey); 
    } catch (error) {
        console.error("Token Invalido", error);
        return null;
    }
};

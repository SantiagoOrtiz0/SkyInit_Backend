export async function generarKey(secret:string):
    Promise<CryptoKey> {
        return await crypto.subtle.importKey(
            "raw",  //Formato de entrada: Secuencia de bits sin codificar
            new TextEncoder().encode(secret),  //Convierte la clave en un Uint8Array
            {name: "HMAC", hash: "SHA-256"},
            false,  //la clave no se podra reexportar despues de ser creada
            ["sign", "verify"],  //Permisos: firmar y verificar
        );
    };   
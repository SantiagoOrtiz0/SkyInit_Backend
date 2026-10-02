import { SMTPClient } from "../Dependencies/dependencias.ts";

interface Datoscorreo  {
    destinatario:string;
    asunto:string;
    mensaje:string;
    codigo? : string;
    html?:string;
}


const CrearCliente =():SMTPClient =>{
    const SMTP_HOST = Deno.env.get("SMTP_HOST")!;
    const SMTP_PORT = Number(Deno.env.get("SMTP_PORT"));
    const SMTP_USER = Deno.env.get("SMTP_USER")!;
    const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD")?.trim() ?? "";

    if (!SMTP_HOST|| !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD){throw new Error ("error alguna variable de entorno esta mal configurada")}
    return new SMTPClient ({
        connection:{
            hostname: SMTP_HOST,
            port : Number (SMTP_PORT),
            tls :true,
            auth : {username:SMTP_USER, password: SMTP_PASSWORD}
        }
    })
};


export const enviarCorreo = async (datos: Datoscorreo): Promise<void> => {
    try {
        const client = CrearCliente();
        console.log("Cliente SMTP creado correctamente, intentando enviar...");
        
        await client.send({
            from: Deno.env.get("SMTP_USER")!,
            to: datos.destinatario,
            subject: datos.asunto,
            content: datos.mensaje,
            html: datos.html,
        });
        
        await client.close();
        console.log("¡Correo enviado por SMTP con éxito!");
    } catch (error) {
        console.error("ERROR CRÍTICO EN CLIENTE SMTP:", error);
        throw error;
    }
};
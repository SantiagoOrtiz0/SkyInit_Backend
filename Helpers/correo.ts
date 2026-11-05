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

    const plain =
      datos.mensaje ||
      "Notificación de SkyInit. Si no ves el mensaje, activa HTML en tu correo.";

    const html =
      datos.html && String(datos.html).trim().length > 0
        ? datos.html
        : `<pre style="font-family:Arial,sans-serif">${plain}</pre>`;

    await client.send({
      from: Deno.env.get("SMTP_USER")!,
      to: datos.destinatario,
      subject: datos.asunto,
      content: plain, // texto plano
      html: html, // HTML (obligatorio para el diseño)
    });

    await client.close();
    console.log("Correo enviado a", datos.destinatario);
  } catch (error) {
    console.error("ERROR SMTP:", error);
    throw error;
  }
};
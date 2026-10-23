export function plantillaBienvenida(nombre: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido a SkyInit</title>
</head>
<body style="margin:0;padding:0;background:#eef1ee;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#eef1ee;padding:32px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellspacing="0" cellpadding="0"
               style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(37,50,41,0.08);">

          <tr>
            <td style="background:#253229;padding:28px 32px;text-align:center;">
              <div style="display:inline-block;width:46px;height:46px;line-height:46px;
                          border:1.5px solid #c8ad72;border-radius:12px;color:#c8ad72;
                          font-size:14px;font-weight:700;letter-spacing:1px;">
                SI
              </div>
              <p style="margin:14px 0 0;font-size:11px;letter-spacing:3px;color:#c8ad72;text-transform:uppercase;">
                SkyInit
              </p>
              <p style="margin:4px 0 0;font-size:18px;color:#f5f1e8;font-weight:600;">
                Inmobiliaria
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 32px 28px;">
              <h1 style="margin:0 0 16px;font-size:22px;color:#111111;font-weight:700;">
                ¡Bienvenido a SkyInit!
              </h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333333;">
                Hola <strong>${nombre}</strong>,
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#4a5560;">
                Gracias por unirte a SkyInit Inmobiliaria. Estamos
                encantados de acompañarte en tu camino hacia
                encontrar el lugar que realmente te impulse.
              </p>
              <div style="text-align:center;">
                <a href="http://localhost:4321/login"
                   style="display:inline-block;padding:14px 28px;background:#c8ad72;color:#1a241c;
                          text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
                  Ir a iniciar sesión
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:#e5e9e5;"></div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 28px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9aa89e;">
                © SkyInit Inmobiliaria
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

export function plantillaRecuperarPassword(
  nombre: string,
  codigo: string,
): string {
  const esEnlace = codigo.startsWith("http");

  const bloqueAccion = esEnlace
    ? `<div style="text-align:center;margin:8px 0;">
  <a href="${codigo}" style="display:inline-block;padding:14px 28px;background:#c8ad72;color:#1a241c;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">Restablecer contrase&#241;a</a>
  </div>`
      : `<p style="margin:0 0 8px;font-size:13px;color:#8a9a8e;text-align:center;">Tu c&#243;digo</p>
  <div style="text-align:center;font-size:28px;font-weight:700;letter-spacing:8px;color:#c8ad72;">${codigo}</div>`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recuperar contraseña</title>
</head>
<body style="margin:0;padding:0;background:#eef1ee;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#eef1ee;padding:32px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellspacing="0" cellpadding="0"
               style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(37,50,41,0.08);">

          <tr>
            <td style="background:#253229;padding:28px 32px;text-align:center;">
              <div style="display:inline-block;width:46px;height:46px;line-height:46px;
                          border:1.5px solid #c8ad72;border-radius:12px;color:#c8ad72;
                          font-size:14px;font-weight:700;letter-spacing:1px;">
                SI
              </div>
              <p style="margin:14px 0 0;font-size:11px;letter-spacing:3px;color:#c8ad72;text-transform:uppercase;">
                SkyInit
              </p>
              <p style="margin:4px 0 0;font-size:18px;color:#f5f1e8;font-weight:600;">
                Inmobiliaria
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 32px 28px;">
              <h1 style="margin:0 0 16px;font-size:22px;color:#111111;font-weight:700;">
                Recuperar contraseña
              </h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333333;">
                Hola <strong>${nombre}</strong>,
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#4a5560;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en
                <strong>SkyInit</strong>. Si fuiste tú, continúa con el botón de abajo.
              </p>
              ${bloqueAccion}
              <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#8a9a8e;">
                Caduca en <strong style="color:#253229;">1 hora</strong>.
                Si no solicitaste esto, ignora este correo.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:#e5e9e5;"></div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 28px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9aa89e;">
                © SkyInit Inmobiliaria
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

function escaparHtml(valor: string): string {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

type EstiloEstado = {
  fondo: string;
  borde: string;
  texto: string;
  etiqueta: string;
  mensaje: string;
  paso: number;
};

function estiloEstado(estado: string): EstiloEstado {
  const clave = estado
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (clave === "aun no aceptada") {
    return {
      fondo: "#fbf6ea",
      borde: "#e4d2a4",
      texto: "#8a6a2f",
      etiqueta: "Aún no aceptada",
      mensaje:
        "Recibimos tu solicitud. La inmobiliaria todavía no la ha aceptado.",
      paso: 1,
    };
  }
  if (clave === "aceptada") {
    return {
      fondo: "#f4f7f2",
      borde: "#c9d7c4",
      texto: "#2f4a38",
      etiqueta: "Aceptada",
      mensaje:
        "Tu solicitud fue aceptada. El equipo ya la tiene en su lista de trabajo.",
      paso: 2,
    };
  }
  if (clave === "en proceso") {
    return {
      fondo: "#f4f6f5",
      borde: "#d3ddd6",
      texto: "#14532d",
      etiqueta: "En proceso",
      mensaje:
        "Tu solicitud está en proceso. Ya estamos trabajando en el servicio.",
      paso: 3,
    };
  }
  if (clave === "finalizado") {
    return {
      fondo: "#eef6f0",
      borde: "#b7d7c0",
      texto: "#1e5c38",
      etiqueta: "Finalizado",
      mensaje:
        "Tu solicitud fue finalizada. Gracias por usar los servicios de SkyInit.",
      paso: 4,
    };
  }

  return {
    fondo: "#f6f7f6",
    borde: "#d9ded9",
    texto: "#14532d",
    etiqueta: estado.trim() || "Actualizado",
    mensaje: "El estado de tu solicitud de servicio fue actualizado.",
    paso: 0,
  };
}

const PASOS_SOLICITUD = [
  "Recibida",
  "Aceptada",
  "En proceso",
  "Finalizado",
] as const;

function filaPasos(pasoActual: number): string {
  const circulos: string[] = [];
  const etiquetas: string[] = [];

  PASOS_SOLICITUD.forEach((etiqueta, indice) => {
    const numero = indice + 1;
    const hecho = pasoActual > 0 && numero < pasoActual;
    const actual = numero === pasoActual;
    const fondo = actual ? "#c8ad72" : hecho ? "#14532d" : "#ffffff";
    const color = actual ? "#1a241c" : hecho ? "#f5f1e8" : "#8a9a8e";
    const borde = actual || hecho ? fondo : "#d5ddd6";
    const colorEtiqueta = actual ? "#14532d" : hecho ? "#3d4f44" : "#8a9a8e";
    const peso = actual ? "700" : "600";

    circulos.push(`<td width="36" align="center" valign="middle">
      <div style="width:28px;height:28px;line-height:28px;margin:0 auto;border-radius:50%;background:${fondo};border:1.5px solid ${borde};color:${color};font-size:13px;font-weight:700;">${numero}</div>
    </td>`);
    etiquetas.push(`<td width="36" align="center" valign="top">
      <p style="margin:8px 0 0;font-size:11px;line-height:1.35;color:${colorEtiqueta};font-weight:${peso};">${etiqueta}</p>
    </td>`);

    if (indice < PASOS_SOLICITUD.length - 1) {
      const linea = pasoActual > numero ? "#14532d" : "#d5ddd6";
      const conector = `<td valign="middle" style="padding:0 2px;">
        <div style="height:2px;line-height:2px;font-size:0;background:${linea};">&nbsp;</div>
      </td>`;
      circulos.push(conector);
      etiquetas.push(`<td></td>`);
    }
  });

  return `<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="margin:0 0 26px;">
    <tr>${circulos.join("")}</tr>
    <tr>${etiquetas.join("")}</tr>
  </table>`;
}

function filaDato(etiqueta: string, valor: string, ultima = false): string {
  const borde = ultima ? "" : "border-bottom:1px solid #e5e9e5;";
  return `<tr>
    <td width="38%" style="padding:13px 16px;background:#f7f8f6;${borde}">
      <p style="margin:0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8a9a8e;">${etiqueta}</p>
    </td>
    <td style="padding:13px 16px;background:#ffffff;${borde}">
      <p style="margin:0;font-size:15px;line-height:1.4;font-weight:700;color:#14532d;">${valor}</p>
    </td>
  </tr>`;
}

export function plantillaEstadoSolicitud(
  nombre: string,
  servicio: string,
  estado: string,
  solicitudId: number,
): string {
  const nombreSeguro = escaparHtml(nombre);
  const servicioSeguro = escaparHtml(servicio);
  const estilo = estiloEstado(estado);
  const etiquetaSegura = escaparHtml(estilo.etiqueta);
  const idSeguro = Number.isFinite(solicitudId) ? String(solicitudId) : "";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Estado de tu solicitud</title>
</head>
<body style="margin:0;padding:0;background:#eef1ee;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    Tu solicitud #${idSeguro} de ${servicioSeguro} está ${etiquetaSegura}.
  </div>
  <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="background:#eef1ee;padding:32px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellspacing="0" cellpadding="0" role="presentation"
               style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">

          <tr>
            <td style="background:#14532d;padding:28px 32px 24px;text-align:center;">
              <div style="display:inline-block;width:46px;height:46px;line-height:46px;
                          border:1.5px solid #c8ad72;border-radius:12px;color:#c8ad72;
                          font-size:14px;font-weight:700;letter-spacing:1px;">
                SI
              </div>
              <p style="margin:14px 0 0;font-size:11px;letter-spacing:3px;color:#c8ad72;text-transform:uppercase;">
                SkyInit
              </p>
              <p style="margin:4px 0 0;font-size:18px;color:#f5f1e8;font-weight:600;">
                Inmobiliaria
              </p>
              <p style="margin:14px 0 0;font-size:12px;letter-spacing:0.4px;color:#d7c39a;">
                Actualización de tu solicitud
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#111111;font-weight:700;">
                Estado de tu solicitud
              </h1>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#333333;">
                Hola <strong>${nombreSeguro}</strong>,
              </p>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#4a5560;">
                Te escribimos porque cambió el estado de tu solicitud del servicio
                <strong style="color:#14532d;">${servicioSeguro}</strong>.
              </p>

              <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="margin:0 0 22px;">
                <tr>
                  <td style="background:${estilo.fondo};border:1px solid ${estilo.borde};border-radius:14px;padding:18px 16px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${estilo.texto};">
                      Estado actual
                    </p>
                    <p style="margin:0;font-size:26px;line-height:1.2;font-weight:700;color:${estilo.texto};">
                      ${etiquetaSegura}
                    </p>
                  </td>
                </tr>
              </table>

              ${filaPasos(estilo.paso)}

              <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="border:1px solid #e5e9e5;border-radius:14px;overflow:hidden;">
                ${filaDato("Solicitud", `#${idSeguro}`)}
                ${filaDato("Servicio", servicioSeguro)}
                ${filaDato("Estado", etiquetaSegura, true)}
              </table>

              <p style="margin:22px 0 0;font-size:15px;line-height:1.65;color:#4a5560;">
                ${estilo.mensaje}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 0;">
              <div style="height:1px;background:#e5e9e5;"></div>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 32px 28px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#9aa89e;">
                Puedes revisar el detalle en Mis solicitudes, dentro de tu cuenta SkyInit.
              </p>
              <p style="margin:0;font-size:12px;color:#9aa89e;">
                © SkyInit Inmobiliaria
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}
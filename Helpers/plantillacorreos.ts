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
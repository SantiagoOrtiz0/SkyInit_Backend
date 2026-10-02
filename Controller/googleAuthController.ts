import { Context } from "../Dependencies/dependencias.ts";
import { crearToken, setTokenCookie } from "../Helpers/jwt.ts";
import { buscarPorCorreo } from "../Model/usuarioModel.ts";
import { db } from "../Model/conexion.ts";
import { usuarios } from "../Model/schema.ts";
import { eq } from "../Dependencies/dependencias.ts";

const CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const CALLBACK_URL  = Deno.env.get("GOOGLE_CALLBACK_URL")!;
const FRONTEND_URL  = Deno.env.get("FRONTEND_URL") ?? "http://localhost:4321";

// Redirigir al usuario a Google
export function googleLogin(ctx: Context) {
    const params = new URLSearchParams({
        client_id:     CLIENT_ID,
        redirect_uri:  CALLBACK_URL,
        response_type: "code",
        scope:         "openid email profile",
        access_type:   "offline",
        prompt:        "select_account",
    });
    ctx.response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

// Google llama aquí con el ?code=
export async function googleCallback(ctx: Context) {
    try {
        const code = ctx.request.url.searchParams.get("code");
        if (!code) {
            ctx.response.redirect(`${FRONTEND_URL}/login?error=oauth_cancelado`);
            return;
        }

        // Intercambiar code por access_token
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id:     CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri:  CALLBACK_URL,
                grant_type:    "authorization_code",
            }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            ctx.response.redirect(`${FRONTEND_URL}/login?error=token_invalido`);
            return;
        }

        // Obtener datos del usuario de Google
        const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const googleUser = await userRes.json();
        // googleUser = { id, email, name, picture, verified_email }

        if (!googleUser.email || !googleUser.verified_email) {
            ctx.response.redirect(`${FRONTEND_URL}/login?error=correo_no_verificado`);
            return;
        }

        // Buscar si ya existe el usuario
        const usuario = await buscarPorCorreo(googleUser.email);

        if (!usuario) {
            // Crear usuario nuevo con Google
            const resultado = await db.insert(usuarios).values({
                nombre:        googleUser.name,
                correo:        googleUser.email,
                contrasenaHash: null,       // sin contraseña local
                googleId:      googleUser.id,
                fotoPerfil:    googleUser.picture,
                rolID:         3,           // rol Usuario por defecto
                estadoCuenta:  "Activa",
                aceptoTerminos: 0,
            });
            const nuevoId = Number(resultado[0].insertId);
            const token = await crearToken(nuevoId, "Usuario");
            setTokenCookie(ctx, token);

            // Redirigir a términos si es nuevo
            ctx.response.redirect(
                `${FRONTEND_URL}/api/auth/google-callback?token=${token}&rol=Usuario&nuevo=true`
            );
            return;
        }

        // Usuario ya existe — actualizar googleId y foto si no los tenía
        if (!usuario.googleId) {
            await db.update(usuarios)
                .set({ googleId: googleUser.id, fotoPerfil: googleUser.picture })
                .where(eq(usuarios.usuarioID, usuario.usuarioID));
        }

        if (usuario.estadoCuenta !== "Activa") {
            ctx.response.redirect(`${FRONTEND_URL}/login?error=cuenta_inactiva`);
            return;
        }

        const token = await crearToken(usuario.usuarioID, usuario.nombreRol);
        setTokenCookie(ctx, token);
        ctx.response.redirect(
            `${FRONTEND_URL}/api/auth/google-callback?token=${token}&rol=${usuario.nombreRol}`
        );

    } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error en Google OAuth:", msg);
    ctx.response.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(msg)}`);
    }
}

function rutaPorRolBackend(rol: string): string {
    const rutas: Record<string, string> = {
        "SuperAdmin":   "/superadmin",
        "Administrador":        "/admin",
        "Agente":       "/agente",
        "Constructora": "/constructora",
        "Usuario":      "/servicios",
    };
    return rutas[rol] ?? "/servicios";
}
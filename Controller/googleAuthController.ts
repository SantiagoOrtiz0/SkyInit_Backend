import { Context } from "../Dependencies/dependencias.ts";
import { crearToken } from "../Helpers/jwt.ts";
import { buscarPorCorreo } from "../Model/usuarioModel.ts";
import { db } from "../Model/conexion.ts";
import { usuarios } from "../Model/schema.ts";
import { eq } from "../Dependencies/dependencias.ts";

const CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const CALLBACK_URL  = Deno.env.get("GOOGLE_CALLBACK_URL")!;
const FRONTEND_URL  = Deno.env.get("FRONTEND_URL") ?? "http://localhost:4321";

const IS_PROD = Deno.env.get("ENV") === "production";
const STATE_COOKIE = "skyinit_oauth_state";

// Codigos de un solo uso (60 s) que el servidor de Astro canjea por la sesion.
// Asi el JWT nunca viaja en una URL.
const codigosPendientes = new Map<string, { token: string; nuevo: boolean; expira: number }>();

function emitirCodigo(token: string, nuevo: boolean): string {
    const ahora = Date.now();
    for (const [k, v] of codigosPendientes) if (v.expira <= ahora) codigosPendientes.delete(k);
    const codigo = crypto.randomUUID() + crypto.randomUUID();
    codigosPendientes.set(codigo, { token, nuevo, expira: ahora + 60_000 });
    return codigo;
}

// POST /auth/google/canjear  { code }  -> { token, nuevo }   (lo llama Astro, no el navegador)
export async function googleCanjear(ctx: Context) {
    try {
        const { code } = await ctx.request.body.json();
        const dato = typeof code === "string" ? codigosPendientes.get(code) : undefined;
        if (typeof code === "string") codigosPendientes.delete(code);
        if (!dato || dato.expira <= Date.now()) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Codigo invalido o expirado" };
            return;
        }
        ctx.response.status = 200;
        ctx.response.body = { token: dato.token, nuevo: dato.nuevo };
    } catch {
        ctx.response.status = 400;
        ctx.response.body = { error: "Solicitud invalida" };
    }
}

// Redirigir al usuario a Google
export async function googleLogin(ctx: Context) {
    const state = crypto.randomUUID();
    await ctx.cookies.set(STATE_COOKIE, state, {
        httpOnly: true, secure: IS_PROD, sameSite: "lax", maxAge: 600, path: "/auth/google",
    });
    const params = new URLSearchParams({
        state,
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
        const state = ctx.request.url.searchParams.get("state");
        const stateEsperado = await ctx.cookies.get(STATE_COOKIE);
        await ctx.cookies.delete(STATE_COOKIE, { path: "/auth/google" });
        if (!state || !stateEsperado || state !== stateEsperado) {
            ctx.response.redirect(`${FRONTEND_URL}/login?error=oauth_estado_invalido`);
            return;
        }
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

            // Redirigir a términos si es nuevo
            ctx.response.redirect(
                `${FRONTEND_URL}/api/auth/google-callback?code=${emitirCodigo(token, true)}`
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
        ctx.response.redirect(
            `${FRONTEND_URL}/api/auth/google-callback?code=${emitirCodigo(token, false)}`
        );

    } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error en Google OAuth:", msg);
    ctx.response.redirect(`${FRONTEND_URL}/login?error=oauth_error`);
    }
}

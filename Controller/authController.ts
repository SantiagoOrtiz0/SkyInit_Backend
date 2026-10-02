import { Context } from "../Dependencies/dependencias.ts";
import { bcrypt } from "../Dependencies/dependencias.ts";
import { CrearToken, setTokenCookie, clearTokenCookie } from "../Helpers/jwt.ts";
import { buscarPorCorreo, buscarPorId, correoExiste, crearUsuario,} from "../Model/usuarioModel.ts";
import { crearTokenReset,buscarTokenReset,borrarTokenReset,actualizarPassword } from "../Model/passwordResetModel.ts";
import { enviarCorreoRecuperarPassword, enviarCorreoBienvenida } from "../services/emailServices.ts";
const FRONT_URL = Deno.env.get("FRONT_URL") ?? "http://localhost:4321";


// ---REGISTRO---
export async function registro (ctx: Context) {
    try {
        const body = await ctx.request.body.json();
        const {Nombre, Correo, Password, Confirmar, Telefono, AceptoTerminos} = body;

        //Validar campos obligatorios
        if (!Nombre || !Correo || !Password || !Confirmar){
            ctx.response.status = 400;
            ctx.response.body = {error: "Todos los campos son obligatorios"};
            return;
        }

        //Validar formato por correo
        const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexCorreo.test(Correo)) {
            ctx.response.status = 400;
            ctx.response.body = {error: "Formato de correo invalido"};
            return;
        }

        //Validar contraseña segura (minimo 8 caracteres,al menos una mayuscula, una minuscula, un numero y un caracter especial)
        const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

        if (!regexPassword.test(Password)) {
            ctx.response.status = 400;
            ctx.response.body = {error: "La contraseña debe contener al menos una letra mayúscula, una letra minúscula, un número y un carácter especial"};
            return;
        }

        //Validar coincidencia de contraseñas
        if (Password !== Confirmar) {
            ctx.response.status = 400;
            ctx.response.body = {error: "Las contraseñas no coinciden"};
            return;
        }

        //Validar correos duplicados
        const existe = await correoExiste(Correo);
        if (existe) {
            ctx.response.status = 409;
            ctx.response.body = {error: "El correo ya esta registrado"};
            return;
        }

        //Validar aceptación de terminos y condiciones
        if (AceptoTerminos !== true) {
            ctx.response.status = 400;
            ctx.response.body = {error: "Debes aceptar los terminos y condiciones para registrarte"};
            return;
        }

        //Hashear contraseña
        const hash  = await bcrypt.hash(Password);

        //Crear usuaro en BD
        const nuevoId = await crearUsuario({
            Nombre,
            Correo,
            Password: hash,
            Telefono: Telefono ?? null,
            RolID: 3,
            AceptoTerminos: true,
        });

        //Generar token
        const token = await CrearToken(nuevoId, "Usuario");
        setTokenCookie(ctx, token);

        try {
            await enviarCorreoBienvenida(Correo, Nombre);
            } catch (mailErr) {
            console.error("Error enviando correo de bienvenida:", mailErr);
            // No devolvemos 500: el usuario ya quedó registrado
        }

        ctx.response.status = 201;
        ctx.response.body = {mensaje: "Usuario registrado correctamente", usuario: {usuarioID: nuevoId, nombre: Nombre, correo: Correo, rol: "Usuario", AceptoTerminos: true, token,},
        };
    } catch (error) {
        console.error("Error en registro:", error);
        ctx.response.status = 500;
        ctx.response.body = {error: "Error interno del servidor"};
    }
}

// ---LOGIN---
export async function login(ctx: Context) {

    try {
        const body = await ctx.request.body.json();
        const{Correo, Password} = body;

        //Validar campos obligatorios
        if (!Correo || !Password) {
            ctx.response.status = 400;
            ctx.response.body = {error: "Correo y contraseña son obligatorios"};
            return;
        }

        //Buscar usuario en BD
        const usuario = await buscarPorCorreo(Correo);
        if (!usuario) {
            ctx.response.status = 401;
            ctx.response.body = {error: "Credenciales incorrectas"};
            return;
        }

        //Verificar estado de la cuenta
        if (usuario.estadoCuenta !== "Activa") {
            ctx.response.status = 403;
            ctx.response.body = {error: "La cuenta esta inactiva"}
            return;
        }

        //Verificar contraseña
        if (!usuario.contrasenaHash) {
            ctx.response.status = 401;
            ctx.response.body = { error: "Credenciales incorrectas" };
            return;
        }
        const passwordValida = await bcrypt.compare(Password, usuario.contrasenaHash as string);

        if(!passwordValida) {
            ctx.response.status = 401;
            ctx.response.body = {error: "Credenciales incorrectas"};
            return;
        }

        //Generar token
        const token = await CrearToken(usuario.usuarioID, usuario.nombreRol);
        setTokenCookie(ctx, token);
        ctx.response.status = 200;
        ctx.response.body = {mensaje: "Inicio de sesion exitoso", usuario: {
            usuarioID: usuario.usuarioID,
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.nombreRol,
            fotoPerfil: usuario.fotoPerfil,
            token: token,
        }};
    } catch (error) {
        console.error("Error en login:", error);
        ctx.response.status = 500;
        ctx.response.body = {error: "Error interno del servidor"}
    }
}

// ---PERFIL (Usuario Autenticado)---
export async function perfil(ctx: Context) {
    try {
        const userState = ctx.state.user as {sub?: string};
        const usuarioId = Number(userState?.sub);

        if(!usuarioId) {
            ctx.response.status = 401;
            ctx.response.body = {error: "No autorizado"};
            return;
        }

        const usuario = await buscarPorId(usuarioId);
        if(!usuario) {
            ctx.response.status = 404;
            ctx.response.body = {error: "Usuario no encontrado"};
            return;
        }

        ctx.response.status = 200;
        const usuarioSeguro = usuario as Omit<typeof usuario, "contrasenaHash">;
        ctx.response.body = {usuario: usuarioSeguro}
    } catch (error) {
        console.error("Error en perfil:", error);
        ctx.response.status = 500;
        ctx.response.body = {error: "Error interno del servidor"};
    }
}

// ---LOGOUT---
export async function logout(ctx: Context) {
    clearTokenCookie(ctx);
    ctx.response.status = 200;
    ctx.response.body = {mensaje: "Sesion cerrada exitosamente"};
}

// --- OLVIDÉ CONTRASEÑA ---
export async function olvidePassword(ctx: Context) {
    try {
        const body = await ctx.request.body.json();
        const { Correo } = body;

        if (!Correo) {
        ctx.response.status = 400;
        ctx.response.body = { error: "El correo es obligatorio" };
        return;
        }

        const mensajeOk =
        "Si el correo está registrado, enviaremos instrucciones para restablecer la contraseña";

        const usuario = await buscarPorCorreo(Correo);

        if (!usuario) {
        ctx.response.status = 200;
        ctx.response.body = { mensaje: mensajeOk };
        return;
        }

        const token = crypto.randomUUID();
        const expirationDate = new Date(Date.now() + 60 * 60 * 1000);

        await crearTokenReset(usuario.usuarioID, token, expirationDate);

        const enlace = `${FRONT_URL}/restablecer-password?token=${token}`;

        try {
        await enviarCorreoRecuperarPassword(
            usuario.correo,
            usuario.nombre,
            enlace,
        );
        } catch (mailErr) {
        console.error("Error enviando correo de recuperación:", mailErr);
        ctx.response.status = 500;
        ctx.response.body = { error: "No se pudo enviar el correo" };
        return;
        }

        ctx.response.status = 200;
        ctx.response.body = { mensaje: mensajeOk };
    } catch (error) {
        console.error("Error en olvidePassword:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Error interno del servidor" };
    }
}

export async function restablecerPassword(ctx: Context) {
    try {
        const body = await ctx.request.body.json();
        const { Token, Password, Confirmar } = body;
        const regexPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

        if (!Token || !Password || !Confirmar) {
        ctx.response.status = 400;
        ctx.response.body = {
            error: "Token, Password y Confirmar son obligatorios",
        };
        return;
        }

        if (Password !== Confirmar) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Las contraseñas no coinciden" };
        return;
        }

        if (!regexPassword.test(Password)) {
        ctx.response.status = 400;
        ctx.response.body = {
            error:
            "La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial",
        };
        return;
        }

        const fila = await buscarTokenReset(Token);
        if (!fila) {
        ctx.response.status = 400;
        ctx.response.body = { error: "El enlace no es válido o ya expiró" };
        return;
        }

        const hash = await bcrypt.hash(Password);
        await actualizarPassword(fila.userId, hash);
        await borrarTokenReset(Token);

        ctx.response.status = 200;
        ctx.response.body = {
        mensaje:
            "Contraseña actualizada correctamente. Ya puedes iniciar sesión.",
        };
    } catch (error) {
        console.error("Error en restablecerPassword:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Error interno del servidor" };
    }
}
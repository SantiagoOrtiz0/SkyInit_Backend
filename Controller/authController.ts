import { Context } from "../Dependencies/dependencias.ts";
import { bcrypt } from "../Dependencies/dependencias.ts";
import { CrearToken, setTokenCookie, clearTokenCookie } from "../Helpers/jwt.ts";
import { buscarPorCorreo, buscarPorId, correoExiste, crearUsuario} from "../Model/usuarioModel.ts";
import { usuarioAceptoTerminos } from "../Model/terminosModel.ts";

// ---REGISTRO---
export async function registro (ctx: Context) {
    try {
        const body = await ctx.request.body.json();
        const {Nombre, Correo, Password, Confirmar, Telefono} = body;

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

        //Validar longitud minima de contraseña
        if (Password.length < 8) {
            ctx.response.status = 400;
            ctx.response.body = {error: "La contraseña debe tener minimo 8 caracteres"};
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

        //Hashear contraseña
        const hash = await bcrypt.hash(Password);

        //Crear usuaro en BD
        const nuevoId = await crearUsuario({
            Nombre,
            Correo,
            Password: hash,
            Telefono: Telefono ?? null,
            RolID: 3,
        });

        //Generar token
        const token = await CrearToken(nuevoId, "Usuario");
        setTokenCookie(ctx, token);
        ctx.response.status = 201;
        ctx.response.body = {mensaje: "Usuario registrado correctamente", usuario: {usuarioID: nuevoId, nombre: Nombre, correo: Correo, rol: "Usuario"},
        };
    } catch (error) {
        console.error("Error en registro:", error);
        ctx.response.status = 500;
        ctx.response.body = {error: "Error interno del servidor"};
    }
}

// ---LOGIN---
export async function login(ctx: Context) {

console.log("Conectando a la base de datos...");

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
        const passwordValida = await bcrypt.compare(Password, usuario.contrasenaHash);
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
        const {contrasenaHash: _omit, ...usuarioSeguro} = usuario;
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
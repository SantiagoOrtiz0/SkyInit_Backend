import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware } from "../Middlewares/validarJWT.ts";
import {
    actualizarPerfilUsuario,
    listarFavoritos,
    guardarFavorito,
    quitarFavorito,
    listarSolicitudesUsuario,
} from "../Controller/usuarioController.ts";

const usuarioRouter = new Router();

usuarioRouter
    // ── Favoritos ──────────────────────────────────────────
    .get(    "/usuario/favoritos", authMiddleware, listarFavoritos)
    .post(   "/usuario/favoritos", authMiddleware, guardarFavorito)
    .delete( "/usuario/favoritos/:propiedadID", authMiddleware, quitarFavorito)

    // ── Solicitudes ────────────────────────────────────────
    .get( "/usuario/solicitudes", authMiddleware, listarSolicitudesUsuario)

    // ── Perfil ──────────────────────────────
    .put( "/usuario/perfil", authMiddleware, actualizarPerfilUsuario);

export default usuarioRouter;
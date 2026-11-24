import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware, rolMiddleware } from "../Middlewares/validarJWT.ts";
import { constructoraScopeMiddleware } from "../Middlewares/constructoraScope.ts";
import { listarNotificaciones, marcarLeida, marcarTodasLeidas } from "../Controller/notificacionesController.ts";
import {
  cambiarEstadoVisita, crearCita, crearVisita, editarCita, misVisitas, propiedadesParaCita, visitasGestion,
} from "../Controller/agendaController.ts";
import {
  calificar, comentar, detallePropiedad, detalleProyecto, detalleServicio, eliminarComentario, metricasInteres, registrarInteres,
} from "../Controller/interaccionController.ts";
import { cambiarEstadoAgente, crearAgente, editarAgente, listarAgentesInmobiliaria } from "../Controller/agentesAdminController.ts";
import {
  asignarTrabajadores, historialSolicitud, reenviarAConstructora, registrarAvanceTrabajo, solicitudesConstructora,
  solicitudesInmobiliaria, trabajosTrabajador,
} from "../Controller/mantenimientoController.ts";
import { limitar } from "../Middlewares/rateLimit.ts";
import { cambiarPassword, resumenCuenta } from "../Controller/cuentaController.ts";
import { editablesMapa, galeria, puntosMapa, ubicarPropiedad, ubicarProyecto } from "../Controller/geoGaleriaController.ts";
import { cambiarEstadoTrabajador, crearTrabajador, grupoTrabajador, listarTrabajadores } from "../Controller/organizacionController.ts";

/** Funciones nuevas (nov 2026): notificaciones, agenda, galeria, geolocalizacion, organizacion, seguimiento, trabajador */
const funcionesRouter = new Router();
const constructora = [authMiddleware, rolMiddleware("Constructora"), constructoraScopeMiddleware] as const;

funcionesRouter
  // Cuenta (cualquier rol): cambio de contraseña y resumen del dashboard
  .put("/api/cuenta/password", authMiddleware, limitar("password", 10, 600), cambiarPassword)
  .get("/api/cuenta/resumen", authMiddleware, resumenCuenta)

  // Notificaciones (cualquier usuario con sesion)
  .get("/api/notificaciones", authMiddleware, listarNotificaciones)
  .post("/api/notificaciones/leer-todas", authMiddleware, marcarTodasLeidas)
  .patch("/api/notificaciones/:id/leida", authMiddleware, marcarLeida)

  // Agenda de visitas
  .post("/api/agenda", authMiddleware, crearVisita)
  .get("/api/agenda/mias", authMiddleware, misVisitas)
  .get("/api/agenda/gestion", authMiddleware, rolMiddleware("Administrador", "Agente"), visitasGestion)
  .patch("/api/agenda/:id/estado", authMiddleware, cambiarEstadoVisita)
  .get("/api/agenda/propiedades", authMiddleware, rolMiddleware("Administrador", "Agente"), propiedadesParaCita)
  .post("/api/agenda/citas", authMiddleware, rolMiddleware("Administrador", "Agente"), crearCita)
  .put("/api/agenda/:id", authMiddleware, rolMiddleware("Administrador", "Agente"), editarCita)

  // Vista detallada, calificaciones, comentarios e interes
  .get("/api/detalle/propiedad/:id", detallePropiedad)
  .get("/api/detalle/proyecto/:id", detalleProyecto)
  .get("/api/detalle/servicio/:id", detalleServicio)
  .post("/api/calificaciones", authMiddleware, limitar("calificar", 30, 600), calificar)
  .post("/api/comentarios", authMiddleware, limitar("comentar", 20, 600), comentar)
  .delete("/api/comentarios/:id", authMiddleware, eliminarComentario)
  .post("/api/interes", limitar("interes", 120, 60), registrarInteres)

  // Panel del administrador: agentes de su inmobiliaria y metricas de interes
  .get("/api/admin/agentes", authMiddleware, rolMiddleware("Administrador"), listarAgentesInmobiliaria)
  .post("/api/admin/agentes", authMiddleware, rolMiddleware("Administrador"), crearAgente)
  .put("/api/admin/agentes/:id", authMiddleware, rolMiddleware("Administrador"), editarAgente)
  .patch("/api/admin/agentes/:id/estado", authMiddleware, rolMiddleware("Administrador"), cambiarEstadoAgente)
  .get("/api/admin/interes", authMiddleware, rolMiddleware("Administrador"), metricasInteres)

  // Mantenimiento: inmobiliaria -> constructora -> trabajadores
  .get("/api/mantenimiento/admin", authMiddleware, rolMiddleware("Administrador"), solicitudesInmobiliaria)
  .post("/api/mantenimiento/admin/:id/reenviar", authMiddleware, rolMiddleware("Administrador"), reenviarAConstructora)
  .get("/api/mantenimiento/constructora", ...constructora, solicitudesConstructora)
  .post("/api/mantenimiento/constructora/:id/asignar", ...constructora, asignarTrabajadores)
  .get("/api/mantenimiento/trabajador", authMiddleware, rolMiddleware("Trabajador"), trabajosTrabajador)
  .post("/api/mantenimiento/trabajador/:id/avance", authMiddleware, rolMiddleware("Trabajador"), registrarAvanceTrabajo)
  .get("/api/mantenimiento/:id/historial", authMiddleware, historialSolicitud)
  .get("/api/trabajador/grupo", authMiddleware, rolMiddleware("Trabajador"), grupoTrabajador)

  // Galeria de fotos y mapa (publicos)
  .get("/api/galeria", galeria)
  .get("/api/geo/puntos", puntosMapa)
  .get("/api/geo/editables", authMiddleware, rolMiddleware("Administrador", "Agente", "Constructora"), editablesMapa)
  .put("/api/geo/propiedades/:id", authMiddleware, rolMiddleware("Administrador", "Agente", "Constructora"), ubicarPropiedad)
  .put("/api/geo/proyectos/:id", authMiddleware, rolMiddleware("Administrador", "Constructora"), ubicarProyecto)

  // Trabajadores de la constructora (los usa el flujo de mantenimiento).
  // La organizacion de obra (etapas, tareas y seguimiento) esta aplazada: su codigo sigue en
  // Controller/organizacionController.ts pero sus rutas no se publican.
  .get("/api/organizacion/trabajadores", ...constructora, listarTrabajadores)
  .post("/api/organizacion/trabajadores", ...constructora, crearTrabajador)
  .patch("/api/organizacion/trabajadores/:id/estado", ...constructora, cambiarEstadoTrabajador);

export { funcionesRouter };

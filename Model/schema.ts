import { mysqlTable, int, varchar, text, decimal, datetime, date, tinyint, sql } from "../Dependencies/dependencias.ts";

// Catalogo

export const roles = mysqlTable("roles", {
    rolID: int("RolID").autoincrement().primaryKey(),
    nombreRol: varchar("NombreRol", {length: 50}).notNull().unique(),
});

export const tiposoperacion = mysqlTable("tiposoperacion", {
    tipoOperacionID: int("TipoOperacionID").autoincrement().primaryKey(),
    descripcion: varchar("Descripcion", {length: 50}).notNull().unique(),
});

export const estadosproyecto = mysqlTable("estadosproyecto", {
    estadoProyectoID: int("EstadoProyectoID").autoincrement().primaryKey(),
    descripcion: varchar("Descripcion", {length: 50}).notNull().unique(),
});

export const estadosagenda = mysqlTable("estadosagenda", {
    estadoAgendaID: int("EstadoAgendaID").autoincrement().primaryKey(),
    descripcion: varchar("Descripcion", {length: 50}).notNull().unique(),
});

export const estadosreparacion = mysqlTable("estadosreparacion", {
  estadoReparacionID: int("EstadoReparacionID").autoincrement().primaryKey(),
  descripcion: varchar("Descripcion", {length: 50}).notNull().unique(),
});

export const plataformas = mysqlTable("plataformas", {
    plataformaID: int("PlataformaID").autoincrement().primaryKey(),
    nombrePlataforma: varchar("NombrePlataforma", {length: 50}).notNull().unique(),
});

export const inmobiliarias = mysqlTable("inmobiliarias", {
    inmobiliariaID: int("InmobiliariaID").autoincrement().primaryKey(),
    nombre: varchar("Nombre", {length: 150}).notNull(),
    contacto: varchar("Contacto", {length: 100}),
    telefono: varchar("Telefono", {length: 20}),
    correo: varchar("Correo", {length: 100}),
    estado: varchar("Estado", {length: 20}).notNull().default("Pendiente"),
    logo: varchar("Logo", {length: 255}),
    descripcion: varchar("Descripcion", {length: 300}),
    ciudad: varchar("Ciudad", {length: 255}),
    fechaRegistro: datetime("FechaRegistro").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Usuarios - Constructoras - Propiedades - Proyectos

export const usuarios = mysqlTable("usuarios", {
    usuarioID: int("UsuarioID").autoincrement().primaryKey(),
    nombre: varchar("Nombre", {length: 100}).notNull(),
    correo: varchar("Correo", {length: 100}).notNull().unique(),
    contrasenaHash: varchar("ContraseñaHash", {length: 255}).notNull(),
    telefono: varchar("Telefono", {length: 20}),
    fechaRegistro: datetime("FechaRegistro").notNull().default(sql`CURRENT_TIMESTAMP`),
    estadoCuenta: varchar("EstadoCuenta", {length: 20}).notNull().default("Activa"),
    rolID: int("RolID").notNull().references(() => roles.rolID, {onDelete: "cascade"}),
    inmobiliariaID: int("InmobiliariaID").references(() => inmobiliarias.inmobiliariaID, {
        onDelete: "set null",
    }),
    fotoPerfil: varchar("FotoPerfil", {length: 255}),
    aceptoTerminos: tinyint("AceptoTerminos").notNull().default(0),
    fechaAceptacionTerminos: datetime("FechaAceptacionTerminos"),
});

export const constructoras = mysqlTable("constructoras", {
    constructoraID: int("ConstructoraID").autoincrement().primaryKey(),
    inmobiliariaID: int("InmobiliariaID").references(() => inmobiliarias.inmobiliariaID, {
        onDelete: "cascade",
    }),

    usuarioID: int("UsuarioID").references(() => usuarios.usuarioID, {
        onDelete: "set null",
    }),
    nombre: varchar("Nombre", {length: 150}).notNull(),
    contacto: varchar("Contacto", {length: 100}),
    telefono: varchar("Telefono", {length: 20}),
    correo: varchar("Correo", {length: 100}),
    estado: varchar("Estado", {length: 255}).default("Pendiente"),
    logo: varchar("Logo", {length: 255}),
    descripcion: varchar("Descripcion", {length: 300}).notNull(),
    ciudad: varchar("Ciudad", {length: 255}),
});

export const propiedades = mysqlTable("propiedades", {
    propiedadID: int("PropiedadID").autoincrement().primaryKey(),
    titulo: varchar("Titulo", {length: 150}).notNull(),
    descripcion: text("Descripcion"),
    precio: decimal("Precio", {precision: 12, scale: 2}).notNull(),
    tipoOperacionID: int("TipoOperacionID").notNull().references(() => 
        tiposoperacion.tipoOperacionID),
        habitaciones: int("Habitaciones"),
        direccion: varchar("Direccion", {length: 255}).notNull(),
        ciudad: varchar("Ciudad", {length: 100}),
        constructoraID: int("ConstructoraID").references(() => 
        constructoras.constructoraID, {
            onDelete: "set null",
        }),
        agenteID: int("AgenteID").references(() => 
            usuarios.usuarioID, {onDelete: "set null"}),
        estado: varchar("Estado", {length: 20}).notNull().default("Disponible"), // Estado disponible, reservada, en mantenimiento y fuera del mercado
        destacada: tinyint("Destacada").notNull().default(0),
        fechaPublicacion: datetime("FechaPublicacion").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const proyectos = mysqlTable("proyectos", {
    proyectoID: int("ProyectoID").autoincrement().primaryKey(),
    nombre: varchar("Nombre", {length: 150}).notNull(),
    estadoProyectoID: int("EstadoProyectoID").notNull().references(() => 
    estadosproyecto.estadoProyectoID),
    porcentajeAvance: decimal("PorcentajeAvance", {
        precision: 5,
        scale: 2,
    })
    .notNull()
    .default("0.00"),
    fechaInicio: date("FechaInicio"),
    fechaFin: date("FechaFin"),
    constructoraID: int("ConstructoraID").references(() => 
    constructoras.constructoraID, {
        onDelete: "set null",
    }),
    descripcion: varchar("Descripcion", {length: 500}),
    ubicacion: varchar("Ubicacion", {length: 255}),
});

export const avancesproyecto = mysqlTable("avancesproyecto", {
    avanceID: int("AvanceID").autoincrement().primaryKey(),
    proyectoID: int("ProyectoID").notNull().references(() => proyectos.proyectoID, {
        onDelete: "cascade",
    }),

    usuarioID: int("UsuarioID").notNull().references(() => usuarios.usuarioID, {
        onDelete: "cascade",
    }),
    porcentaje: decimal("Porcentaje", {
        precision: 5,
        scale: 2,
    }).notNull(),
    nota: text("Nota"),

    fechaRegistro: datetime("FechaRegistro").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Seccion de interaccion del usuario con las propiedades

export const agendas = mysqlTable("agendas", {
    agendaID: int("AgendaID").autoincrement().primaryKey(),
    usuarioID: int("UsuarioID").notNull()
    .references(() => usuarios.usuarioID, {onDelete: "cascade"}),
    propiedadID: int("PropiedadID").notNull().references(() =>
        propiedades.propiedadID, {onDelete: "cascade"}),
    fechaVisita: datetime("FechaVisita").notNull(),
    estadoAgendaID: int("EstadoAgendaID").notNull().references(() =>
    estadosagenda.estadoAgendaID),
});


export const calificaciones = mysqlTable("calificaciones", {
    calificacionID: int("CalificacionID").autoincrement().primaryKey(),
    usuarioID: int("UsuarioID").notNull().
    references(() => usuarios.usuarioID, {onDelete: "cascade"}),
    propiedadID: int("PropiedadID").notNull()
    .references(() => propiedades.propiedadID, {onDelete: "cascade"}),
    puntaje: tinyint("Puntaje").notNull(), //Valor entre 1 y 5
    fechaCalificacion: datetime("FechaCalificacion").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const comentarios = mysqlTable("comentarios", {
    comentarioID: int("ComentarioID").autoincrement().primaryKey(),
    usuarioID: int("UsuarioID").notNull().
    references(() => usuarios.usuarioID, {onDelete: "cascade"}),
    propiedadID: int("PropiedadID").notNull().references(() => 
    propiedades.propiedadID, {onDelete: "cascade"}),
    contenido: text("Contenido").notNull(),
    fechaComentario: datetime("FechaComentario").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const favoritos = mysqlTable("favoritos", {
    favoritoID: int("FavoritoID").autoincrement().primaryKey(),
    usuarioID: int("UsuarioID").notNull()
    .references(() => usuarios.usuarioID, {onDelete: "cascade"}),
    propiedadID: int("PropiedadID").notNull().references(() => propiedades.propiedadID, {
        onDelete: "cascade",
    }),
    fechaAgregado: datetime("FechaAgregado").notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const historialpropiedades = mysqlTable("historialpropiedades", {
    historialID: int("HistorialID").autoincrement().primaryKey(),
    usuarioID: int("UsuarioID").notNull()
    .references(() => usuarios.usuarioID, {onDelete: "cascade"}),
    propiedadID: int("PropiedadID").notNull()
    .references(() => propiedades.propiedadID, {onDelete: "cascade"}),
    fechaAcceso: datetime("FechaAcceso").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const estadisticas = mysqlTable("estadisticas", {
    estadisticaID: int("EstadisticaID").autoincrement().primaryKey(),
    propiedadID: int("PropiedadID").references(() => 
    propiedades.propiedadID, {
        onDelete: "cascade",
    }),
    proyectoID: int("ProyectoID").references(() => proyectos.proyectoID, {
        onDelete: "cascade"
    }),
    visitas: int("Visitas").default(0),
    favoritosCount: int("Favoritos").default(0),
    comentariosCount: int("Comentarios").default(0),
});

// Imagenes

export const imagenesconstructora = mysqlTable("imagenesconstructora", {
  imagenID: int("ImagenID").autoincrement().primaryKey(),
  constructoraID: int("ConstructoraID")
    .notNull()
    .references(() => constructoras.constructoraID, { onDelete: "cascade" }),
  url: varchar("URL", { length: 255 }).notNull(),
  esLogo: tinyint("EsLogo").notNull().default(0),
});


export const imagenespropiedad = mysqlTable("imagenespropiedad", {
  imagenID: int("ImagenID").autoincrement().primaryKey(),
  propiedadID: int("PropiedadID")
    .notNull()
    .references(() => propiedades.propiedadID, { onDelete: "cascade" }),
  url: varchar("URL", { length: 255 }).notNull(),
});


export const imagenesproyecto = mysqlTable("imagenesproyecto", {
  imagenID: int("ImagenID").autoincrement().primaryKey(),
  proyectoID: int("ProyectoID")
    .notNull()
    .references(() => proyectos.proyectoID, { onDelete: "cascade" }),
  url: varchar("URL", { length: 255 }),
});

// Consultas - Mensajes- Notificaciones
export const consultas = mysqlTable("consultas", {
  consultaID: int("ConsultaID").autoincrement().primaryKey(),
  usuarioID: int("UsuarioID")
    .notNull()
    .references(() => usuarios.usuarioID, { onDelete: "cascade" }),
  propiedadID: int("PropiedadID").references(() => propiedades.propiedadID, {
    onDelete: "set null",
  }),
  agenteID: int("AgenteID").references(() => usuarios.usuarioID, { onDelete: "set null" }),
  asunto: varchar("Asunto", { length: 200 }).notNull(),
  estado: varchar("Estado", { length: 30 }).notNull().default("Abierta"),
  fechaCreacion: datetime("FechaCreacion").notNull().default(sql`CURRENT_TIMESTAMP`),
});


export const mensajesconsulta = mysqlTable("mensajesconsulta", {
  mensajeID: int("MensajeID").autoincrement().primaryKey(),
  consultaID: int("ConsultaID")
    .notNull()
    .references(() => consultas.consultaID, { onDelete: "cascade" }),
  remitenteID: int("RemitenteID")
    .notNull()
    .references(() => usuarios.usuarioID, { onDelete: "cascade" }),
  contenido: text("Contenido").notNull(),
  fechaEnvio: datetime("FechaEnvio").notNull().default(sql`CURRENT_TIMESTAMP`),
  leido: tinyint("Leido").notNull().default(0),
});


export const notificaciones = mysqlTable("notificaciones", {
  notificacionID: int("NotificacionID").autoincrement().primaryKey(),
  usuarioID: int("UsuarioID")
    .notNull()
    .references(() => usuarios.usuarioID, { onDelete: "cascade" }),
  titulo: varchar("Titulo", { length: 150 }).notNull(),
  mensaje: text("Mensaje").notNull(),
  leida: tinyint("Leida").notNull().default(0),
  fechaCreacion: datetime("FechaCreacion").notNull().default(sql`CURRENT_TIMESTAMP`),
  tipoNotificacion: varchar("TipoNotificacion", { length: 50 }).notNull(),
  entidadID: int("EntidadID"),
  entidadTipo: varchar("EntidadTipo", { length: 50 }),
});


export const reportes = mysqlTable("reportes", {
  reporteID: int("ReporteID").autoincrement().primaryKey(),
  usuarioID: int("UsuarioID")
    .notNull()
    .references(() => usuarios.usuarioID, { onDelete: "cascade" }),
  fechaReporte: datetime("FechaReporte").notNull().default(sql`CURRENT_TIMESTAMP`),
});


export const detallereporte = mysqlTable("detallereporte", {
  detalleID: int("DetalleID").autoincrement().primaryKey(),
  reporteID: int("ReporteID")
    .notNull()
    .references(() => reportes.reporteID, { onDelete: "cascade" }),
  descripcion: text("Descripcion").notNull(),
});

// Mantenimiento - Reparaciones

export const serviciosmantenimiento = mysqlTable("serviciosmantenimiento", {
  servicioID: int("ServicioID").autoincrement().primaryKey(),
  inmobiliariaID: int("InmobiliariaID").references(() => inmobiliarias.inmobiliariaID, {
    onDelete: "cascade",
  }),
  nombre: varchar("Nombre", { length: 150 }).notNull(),
  descripcion: text("Descripcion").notNull(),
  precio: decimal("Precio", { precision: 12, scale: 2 }).notNull(),
  estado: varchar("Estado", { length: 20 }).notNull().default("Activo"),
  imagen: varchar("Imagen", { length: 255 }),
});


export const serviciossolicitados = mysqlTable("serviciossolicitados", {
  solicitudID: int("SolicitudID").autoincrement().primaryKey(),
  servicioID: int("ServicioID")
    .notNull()
    .references(() => serviciosmantenimiento.servicioID, { onDelete: "cascade" }),
  propiedadID: int("PropiedadID")
    .notNull()
    .references(() => propiedades.propiedadID, { onDelete: "cascade" }),
  usuarioID: int("UsuarioID")
    .notNull()
    .references(() => usuarios.usuarioID, { onDelete: "cascade" }),
  fechaSolicitud: datetime("FechaSolicitud").notNull().default(sql`CURRENT_TIMESTAMP`),
  estadoReparacionID: int("EstadoReparacionID").references(
    () => estadosreparacion.estadoReparacionID,
  ),
});

export const reparaciones = mysqlTable("reparaciones", {
  reparacionID: int("ReparacionID").autoincrement().primaryKey(),
  usuarioID: int("UsuarioID")
    .notNull()
    .references(() => usuarios.usuarioID, { onDelete: "cascade" }),
  propiedadID: int("PropiedadID").references(() => propiedades.propiedadID, {
    onDelete: "set null",
  }),
  descripcion: text("Descripcion").notNull(),
  estadoReparacionID: int("EstadoReparacionID")
    .notNull()
    .references(() => estadosreparacion.estadoReparacionID),
  fechaSolicitud: datetime("FechaSolicitud").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Cuenta - Sesion - Redes Sociales

export const passwordresettokens = mysqlTable("passwordresettokens", {
  id: int("Id").autoincrement().primaryKey(),
  userId: int("UserId")
    .notNull()
    .references(() => usuarios.usuarioID, { onDelete: "cascade" }),
  token: varchar("Token", { length: 255 }).notNull(),
  expirationDate: datetime("ExpirationDate").notNull(),
});


export const sesiones = mysqlTable("sesiones", {
  sesionID: int("SesionID").autoincrement().primaryKey(),
  usuarioID: int("UsuarioID")
    .notNull()
    .references(() => usuarios.usuarioID, { onDelete: "cascade" }),
  fechaInicio: datetime("FechaInicio").notNull().default(sql`CURRENT_TIMESTAMP`),
  fechaFin: datetime("FechaFin"),
  token: varchar("Token", { length: 255 }).notNull().unique(),
});


export const redessociales = mysqlTable("redessociales", {
  redID: int("RedID").autoincrement().primaryKey(),
  usuarioID: int("UsuarioID")
    .notNull()
    .references(() => usuarios.usuarioID, { onDelete: "cascade" }),
  plataformaID: int("PlataformaID")
    .notNull()
    .references(() => plataformas.plataformaID),
  url: varchar("URL", { length: 255 }).notNull(),
});
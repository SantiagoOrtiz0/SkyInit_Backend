-- SkyInit · Migracion 001 · Nuevas funciones (nov 2026)
-- Organizacion de proyecto, seguimiento, rol Trabajador, agenda, geolocalizacion, notificaciones
-- y endurecimiento de la recuperacion de contraseña.
-- Aplicar una sola vez sobre la BD existente:
--   mysql -u <usuario> -p skyinit < migraciones/001_nuevas_funciones.sql

-- Recuperacion de contraseña: tipo (codigo/token) e intentos
ALTER TABLE passwordresettokens
  ADD COLUMN IF NOT EXISTS Tipo varchar(10) NOT NULL DEFAULT 'token',
  ADD COLUMN IF NOT EXISTS Intentos int NOT NULL DEFAULT 0;

-- Rol del trabajador
INSERT IGNORE INTO roles (RolID, NombreRol) VALUES (6, 'Trabajador');

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS ConstructoraID int(11) DEFAULT NULL,
  ADD KEY IF NOT EXISTS idx_usuarios_constructora (ConstructoraID);
ALTER TABLE usuarios
  ADD CONSTRAINT fk_usuarios_constructora FOREIGN KEY (ConstructoraID)
  REFERENCES constructoras (ConstructoraID) ON DELETE SET NULL;

-- Geolocalizacion
ALTER TABLE propiedades
  ADD COLUMN IF NOT EXISTS Latitud decimal(10,7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS Longitud decimal(10,7) DEFAULT NULL;
ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS Latitud decimal(10,7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS Longitud decimal(10,7) DEFAULT NULL;

-- Agenda de visitas
ALTER TABLE agendas
  ADD COLUMN IF NOT EXISTS Notas varchar(300) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS FechaCreacion datetime NOT NULL DEFAULT current_timestamp();

-- Organizacion del proyecto: etapas y tareas
CREATE TABLE IF NOT EXISTS etapasproyecto (
  EtapaID int(11) NOT NULL AUTO_INCREMENT,
  ProyectoID int(11) NOT NULL,
  Nombre varchar(120) NOT NULL,
  Orden int(11) NOT NULL DEFAULT 0,
  FechaInicio date DEFAULT NULL,
  FechaFin date DEFAULT NULL,
  PRIMARY KEY (EtapaID),
  KEY idx_etapas_proyecto (ProyectoID),
  CONSTRAINT fk_etapas_proyecto FOREIGN KEY (ProyectoID) REFERENCES proyectos (ProyectoID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tareasproyecto (
  TareaID int(11) NOT NULL AUTO_INCREMENT,
  ProyectoID int(11) NOT NULL,
  EtapaID int(11) NOT NULL,
  Titulo varchar(150) NOT NULL,
  Descripcion text DEFAULT NULL,
  AsignadoA int(11) DEFAULT NULL,
  Estado varchar(20) NOT NULL DEFAULT 'Pendiente',
  Prioridad varchar(10) NOT NULL DEFAULT 'Media',
  FechaLimite date DEFAULT NULL,
  FechaCreacion datetime NOT NULL DEFAULT current_timestamp(),
  FechaCompletada datetime DEFAULT NULL,
  PRIMARY KEY (TareaID),
  KEY idx_tareas_proyecto (ProyectoID),
  KEY idx_tareas_etapa (EtapaID),
  KEY idx_tareas_asignado (AsignadoA),
  CONSTRAINT fk_tareas_proyecto FOREIGN KEY (ProyectoID) REFERENCES proyectos (ProyectoID) ON DELETE CASCADE,
  CONSTRAINT fk_tareas_etapa FOREIGN KEY (EtapaID) REFERENCES etapasproyecto (EtapaID) ON DELETE CASCADE,
  CONSTRAINT fk_tareas_usuario FOREIGN KEY (AsignadoA) REFERENCES usuarios (UsuarioID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seguimiento: bitacora de cada tarea
CREATE TABLE IF NOT EXISTS seguimientotareas (
  SeguimientoID int(11) NOT NULL AUTO_INCREMENT,
  TareaID int(11) NOT NULL,
  UsuarioID int(11) NOT NULL,
  Comentario text NOT NULL,
  EstadoNuevo varchar(20) DEFAULT NULL,
  Fecha datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (SeguimientoID),
  KEY idx_seguimiento_tarea (TareaID),
  CONSTRAINT fk_seguimiento_tarea FOREIGN KEY (TareaID) REFERENCES tareasproyecto (TareaID) ON DELETE CASCADE,
  CONSTRAINT fk_seguimiento_usuario FOREIGN KEY (UsuarioID) REFERENCES usuarios (UsuarioID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notificaciones: indice para la campana
ALTER TABLE notificaciones ADD KEY IF NOT EXISTS idx_notif_usuario (UsuarioID, Leida);

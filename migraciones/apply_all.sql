-- Script de aplicacion segura de todas las migraciones SkyInit
-- Idempotente: se puede correr varias veces sin error

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================
-- MIGRACION 001
-- =============================================

-- passwordresettokens
ALTER TABLE passwordresettokens
  ADD COLUMN IF NOT EXISTS Tipo varchar(10) NOT NULL DEFAULT 'token',
  ADD COLUMN IF NOT EXISTS Intentos int NOT NULL DEFAULT 0;

-- Rol Trabajador
INSERT IGNORE INTO roles (RolID, NombreRol) VALUES (6, 'Trabajador');

-- ConstructoraID en usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS ConstructoraID int(11) DEFAULT NULL;

-- Indice (ignorar si ya existe)
SET @exist_idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'usuarios' AND index_name = 'idx_usuarios_constructora');
SET @sql_idx = IF(@exist_idx = 0,
  'ALTER TABLE usuarios ADD KEY idx_usuarios_constructora (ConstructoraID)',
  'SELECT 1');
PREPARE stmt FROM @sql_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK (ignorar si ya existe)
SET @exist_fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE table_schema = DATABASE() AND table_name = 'usuarios' AND constraint_name = 'fk_usuarios_constructora');
SET @sql_fk = IF(@exist_fk = 0,
  'ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_constructora FOREIGN KEY (ConstructoraID) REFERENCES constructoras (ConstructoraID) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Geolocalizacion propiedades
ALTER TABLE propiedades
  ADD COLUMN IF NOT EXISTS Latitud decimal(10,7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS Longitud decimal(10,7) DEFAULT NULL;

-- Geolocalizacion proyectos
ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS Latitud decimal(10,7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS Longitud decimal(10,7) DEFAULT NULL;

-- Agenda: notas y fechaCreacion
ALTER TABLE agendas
  ADD COLUMN IF NOT EXISTS Notas varchar(300) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS FechaCreacion datetime NOT NULL DEFAULT current_timestamp();

-- etapasproyecto
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

-- tareasproyecto
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

-- seguimientotareas
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

-- Notificaciones indice
SET @exist_idx2 = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'notificaciones' AND index_name = 'idx_notif_usuario');
SET @sql_idx2 = IF(@exist_idx2 = 0,
  'ALTER TABLE notificaciones ADD KEY idx_notif_usuario (UsuarioID, Leida)',
  'SELECT 1');
PREPARE stmt FROM @sql_idx2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================
-- MIGRACION 002
-- =============================================

-- calificaciones: PropiedadID nullable + ServicioID
ALTER TABLE calificaciones
  MODIFY COLUMN PropiedadID int(11) DEFAULT NULL;

ALTER TABLE calificaciones
  ADD COLUMN IF NOT EXISTS ServicioID int(11) DEFAULT NULL;

SET @exist_idx3 = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'calificaciones' AND index_name = 'idx_calif_servicio');
SET @sql_idx3 = IF(@exist_idx3 = 0,
  'ALTER TABLE calificaciones ADD KEY idx_calif_servicio (ServicioID)',
  'SELECT 1');
PREPARE stmt FROM @sql_idx3; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_uq1 = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE table_schema = DATABASE() AND table_name = 'calificaciones' AND constraint_name = 'uq_calif_propiedad');
SET @sql_uq1 = IF(@exist_uq1 = 0,
  'ALTER TABLE calificaciones ADD UNIQUE KEY uq_calif_propiedad (UsuarioID, PropiedadID)',
  'SELECT 1');
PREPARE stmt FROM @sql_uq1; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_uq2 = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE table_schema = DATABASE() AND table_name = 'calificaciones' AND constraint_name = 'uq_calif_servicio');
SET @sql_uq2 = IF(@exist_uq2 = 0,
  'ALTER TABLE calificaciones ADD UNIQUE KEY uq_calif_servicio (UsuarioID, ServicioID)',
  'SELECT 1');
PREPARE stmt FROM @sql_uq2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_fk2 = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE table_schema = DATABASE() AND table_name = 'calificaciones' AND constraint_name = 'fk_calif_servicio');
SET @sql_fk2 = IF(@exist_fk2 = 0,
  'ALTER TABLE calificaciones ADD CONSTRAINT fk_calif_servicio FOREIGN KEY (ServicioID) REFERENCES serviciosmantenimiento (ServicioID) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql_fk2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- comentarios: PropiedadID nullable + ServicioID
ALTER TABLE comentarios
  MODIFY COLUMN PropiedadID int(11) DEFAULT NULL;

ALTER TABLE comentarios
  ADD COLUMN IF NOT EXISTS ServicioID int(11) DEFAULT NULL;

SET @exist_idx4 = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'comentarios' AND index_name = 'idx_coment_servicio');
SET @sql_idx4 = IF(@exist_idx4 = 0,
  'ALTER TABLE comentarios ADD KEY idx_coment_servicio (ServicioID)',
  'SELECT 1');
PREPARE stmt FROM @sql_idx4; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_fk3 = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE table_schema = DATABASE() AND table_name = 'comentarios' AND constraint_name = 'fk_coment_servicio');
SET @sql_fk3 = IF(@exist_fk3 = 0,
  'ALTER TABLE comentarios ADD CONSTRAINT fk_coment_servicio FOREIGN KEY (ServicioID) REFERENCES serviciosmantenimiento (ServicioID) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql_fk3; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================
-- MIGRACION 003
-- =============================================
INSERT IGNORE INTO estadosagenda (EstadoAgendaID, Descripcion) VALUES (4, 'Finalizada');

-- =============================================
-- MIGRACION 004
-- =============================================
SET @exist_col_fp = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE table_schema = DATABASE() AND table_name = 'serviciossolicitados' AND column_name = 'FechaProgramada');
SET @sql_col_fp = IF(@exist_col_fp = 0,
  'ALTER TABLE serviciossolicitados ADD COLUMN FechaProgramada DATETIME NULL',
  'SELECT 1');
PREPARE stmt FROM @sql_col_fp; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Migraciones aplicadas correctamente' AS resultado;

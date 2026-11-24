-- SkyInit · Migracion 002 · Observaciones del cliente (nov 2026)
-- Calificaciones y comentarios de servicios, citas creadas por agentes, flujo de mantenimiento
-- (inmobiliaria -> constructora -> trabajadores) y metricas de interes.
-- Aplicar despues de la 001:  mysql -u <usuario> -p skyinit < migraciones/002_observaciones.sql

-- Calificaciones y comentarios: ahora tambien sobre servicios
ALTER TABLE calificaciones
  MODIFY PropiedadID int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ServicioID int(11) DEFAULT NULL,
  ADD KEY IF NOT EXISTS idx_calif_servicio (ServicioID),
  ADD UNIQUE KEY IF NOT EXISTS uq_calif_propiedad (UsuarioID, PropiedadID),
  ADD UNIQUE KEY IF NOT EXISTS uq_calif_servicio (UsuarioID, ServicioID);
ALTER TABLE calificaciones
  ADD CONSTRAINT fk_calif_servicio FOREIGN KEY (ServicioID) REFERENCES serviciosmantenimiento (ServicioID) ON DELETE CASCADE;

ALTER TABLE comentarios
  MODIFY PropiedadID int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ServicioID int(11) DEFAULT NULL,
  ADD KEY IF NOT EXISTS idx_coment_servicio (ServicioID);
ALTER TABLE comentarios
  ADD CONSTRAINT fk_coment_servicio FOREIGN KEY (ServicioID) REFERENCES serviciosmantenimiento (ServicioID) ON DELETE CASCADE;

-- Agenda: citas creadas por el agente (el cliente puede no tener cuenta) y recordatorios
ALTER TABLE agendas
  MODIFY UsuarioID int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS AgenteID int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ClienteNombre varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ClienteContacto varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS RecordatorioEnviado tinyint(1) NOT NULL DEFAULT 0,
  ADD KEY IF NOT EXISTS idx_agenda_agente (AgenteID),
  ADD KEY IF NOT EXISTS idx_agenda_fecha (FechaVisita);
ALTER TABLE agendas
  ADD CONSTRAINT fk_agenda_agente FOREIGN KEY (AgenteID) REFERENCES usuarios (UsuarioID) ON DELETE SET NULL;

-- Mantenimiento: la inmobiliaria reenvia la solicitud a una constructora asociada
ALTER TABLE serviciossolicitados
  ADD COLUMN IF NOT EXISTS ConstructoraID int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS FechaReenvio datetime DEFAULT NULL,
  ADD KEY IF NOT EXISTS idx_solicitud_constructora (ConstructoraID);
ALTER TABLE serviciossolicitados
  ADD CONSTRAINT fk_solicitud_constructora FOREIGN KEY (ConstructoraID) REFERENCES constructoras (ConstructoraID) ON DELETE SET NULL;

-- ... y la constructora asigna un grupo de trabajadores
CREATE TABLE IF NOT EXISTS trabajadoressolicitud (
  SolicitudID int(11) NOT NULL,
  TrabajadorID int(11) NOT NULL,
  FechaAsignacion datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (SolicitudID, TrabajadorID),
  KEY idx_ts_trabajador (TrabajadorID),
  CONSTRAINT fk_ts_solicitud FOREIGN KEY (SolicitudID) REFERENCES serviciossolicitados (SolicitudID) ON DELETE CASCADE,
  CONSTRAINT fk_ts_trabajador FOREIGN KEY (TrabajadorID) REFERENCES usuarios (UsuarioID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS historialsolicitud (
  HistorialID int(11) NOT NULL AUTO_INCREMENT,
  SolicitudID int(11) NOT NULL,
  UsuarioID int(11) DEFAULT NULL,
  Comentario text NOT NULL,
  EstadoReparacionID int(11) DEFAULT NULL,
  Fecha datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (HistorialID),
  KEY idx_hs_solicitud (SolicitudID),
  CONSTRAINT fk_hs_solicitud FOREIGN KEY (SolicitudID) REFERENCES serviciossolicitados (SolicitudID) ON DELETE CASCADE,
  CONSTRAINT fk_hs_usuario FOREIGN KEY (UsuarioID) REFERENCES usuarios (UsuarioID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Metricas de interes por propiedad (vista del detalle, clic en "ver en mapa")
CREATE TABLE IF NOT EXISTS interespropiedad (
  InteresID int(11) NOT NULL AUTO_INCREMENT,
  PropiedadID int(11) NOT NULL,
  UsuarioID int(11) DEFAULT NULL,
  Tipo varchar(20) NOT NULL,
  Fecha datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (InteresID),
  KEY idx_interes_propiedad (PropiedadID, Tipo),
  CONSTRAINT fk_interes_propiedad FOREIGN KEY (PropiedadID) REFERENCES propiedades (PropiedadID) ON DELETE CASCADE,
  CONSTRAINT fk_interes_usuario FOREIGN KEY (UsuarioID) REFERENCES usuarios (UsuarioID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

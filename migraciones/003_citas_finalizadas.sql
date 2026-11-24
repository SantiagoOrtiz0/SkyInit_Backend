-- SkyInit · Migracion 003 · Estado "Finalizada" para las citas (Pendiente -> Confirmada -> Finalizada)
INSERT IGNORE INTO estadosagenda (EstadoAgendaID, Descripcion) VALUES (4, 'Finalizada');

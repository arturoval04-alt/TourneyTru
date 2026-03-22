-- Script para corregir el tamaño de las columnas de imagen/URL
-- Cambia de NVARCHAR(1000) a NVARCHAR(MAX) para soportar Base64 largo

USE tourneytru;
GO

-- 1. Tabla de Usuarios
ALTER TABLE users ALTER COLUMN profile_picture NVARCHAR(MAX);
PRINT '✔ users.profile_picture ampliado';

-- 2. Tabla de Ligas
ALTER TABLE leagues ALTER COLUMN logo_url NVARCHAR(MAX);
PRINT '✔ leagues.logo_url ampliado';

-- 3. Tabla de Torneos
ALTER TABLE tournaments ALTER COLUMN logo_url NVARCHAR(MAX);
PRINT '✔ tournaments.logo_url ampliado';

-- 4. Tabla de Equipos
ALTER TABLE teams ALTER COLUMN logo_url NVARCHAR(MAX);
PRINT '✔ teams.logo_url ampliado';

-- 5. Tabla de Jugadores
ALTER TABLE players ALTER COLUMN photo_url NVARCHAR(MAX);
PRINT '✔ players.photo_url ampliado';

-- 6. Tabla de Noticias
ALTER TABLE tournament_news ALTER COLUMN cover_url NVARCHAR(MAX);
PRINT '✔ tournament_news.cover_url ampliado';

GO
PRINT '✅ Todas las columnas de imagen han sido ampliadas a NVARCHAR(MAX)';

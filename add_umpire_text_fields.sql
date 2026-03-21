-- Script para agregar campos de texto para Umpires directamente en la tabla de juegos
-- Esto permite escribir los nombres manualmente sin depender de la tabla 'umpires'

ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS umpire_plate TEXT,
ADD COLUMN IF NOT EXISTS umpire_base1 TEXT,
ADD COLUMN IF NOT EXISTS umpire_base2 TEXT,
ADD COLUMN IF NOT EXISTS umpire_base3 TEXT;

-- Comentario para documentar los campos
COMMENT ON COLUMN public.games.umpire_plate IS 'Nombre del Umpire de Home / Plate';
COMMENT ON COLUMN public.games.umpire_base1 IS 'Nombre del Umpire de 1ra Base';
COMMENT ON COLUMN public.games.umpire_base2 IS 'Nombre del Umpire de 2da Base';
COMMENT ON COLUMN public.games.umpire_base3 IS 'Nombre del Umpire de 3ra Base';

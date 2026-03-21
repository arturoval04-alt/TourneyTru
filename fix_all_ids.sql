-- Script para corregir la generación automática de IDs en varias tablas clave
-- Ejecuta este código en el Editor SQL de Supabase

-- 1. Asegurar extensión pgcrypto
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Corregir tabla 'lineups' (o 'Lineups')
-- Intentamos con ambos nombres comunes por si hay discrepancia de mayúsculas
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'lineups') THEN
        ALTER TABLE public.lineups ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'Lineups') THEN
        ALTER TABLE public."Lineups" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    END IF;
END $$;

-- 3. Corregir tabla 'games' (por si acaso no se ejecutó el anterior)
ALTER TABLE public.games ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- 4. Corregir tabla 'plays' (Jugadas Play-by-play)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'plays') THEN
        ALTER TABLE public.plays ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    END IF;
END $$;

-- 5. Corregir tabla de cambios de lineup
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'lineup_changes') THEN
        ALTER TABLE public.lineup_changes ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    END IF;
    -- Algunos sistemas usan CamelCase si no se especifica @@map
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'LineupChange') THEN
        ALTER TABLE public."LineupChange" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    END IF;
END $$;

-- Comentario de éxito
COMMENT ON COLUMN public.games.id IS 'ID autogenerado corregido';

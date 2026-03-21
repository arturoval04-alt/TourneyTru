-- Script para corregir la generación automática de IDs en la tabla 'games'
-- Ejecuta este código en el Editor SQL de Supabase

-- 1. Habilitar la extensión para generar UUIDs si no está activada
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Asegurarnos de que el ID tenga un valor por defecto (UUID como texto para compatibilidad)
ALTER TABLE public.games 
ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Comprobación: Si tu base de datos usa UUID real en lugar de TEXT, usa el siguiente comando en su lugar:
-- ALTER TABLE public.games ALTER COLUMN id SET DEFAULT gen_random_uuid();

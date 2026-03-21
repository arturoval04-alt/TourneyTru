-- Script para agregar la columna missing 'playback_id' a la tabla 'games'
-- Esta columna es necesaria para la integración con Livepeer/Streaming
-- Ejecuta este código en el Editor SQL de Supabase

ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS playback_id TEXT;

-- Comentario para identificar el propósito de la columna
COMMENT ON COLUMN public.games.playback_id IS 'ID de reproducción para el stream en vivo (Livepeer)';

-- Script para crear la tabla de noticias del torneo (CORREGIDO: Tipos TEXT para llaves foráneas)
-- Ejecuta este código en el Editor SQL de tu Dashboard de Supabase

CREATE TABLE IF NOT EXISTS public.tournament_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    author_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    facebook_url TEXT,
    type TEXT DEFAULT 'Noticia', -- 'Noticia', 'Aviso', 'Resultado'
    has_video BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.tournament_news ENABLE ROW LEVEL SECURITY;

-- Políticas de Acceso
-- 1. Cualquiera puede ver las noticias
CREATE POLICY "Cualquiera puede ver noticias" 
ON public.tournament_news FOR SELECT 
USING (true);

-- 2. Usuarios autenticados pueden insertar
CREATE POLICY "Admins pueden insertar noticias" 
ON public.tournament_news FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 3. Usuarios autenticados pueden actualizar / borrar
CREATE POLICY "Admins pueden actualizar noticias" 
ON public.tournament_news FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins pueden borrar noticias" 
ON public.tournament_news FOR DELETE 
USING (auth.role() = 'authenticated');

-- Comentario para identificar la tabla
COMMENT ON TABLE public.tournament_news IS 'Tabla para las noticias y anuncios de torneos específicos';

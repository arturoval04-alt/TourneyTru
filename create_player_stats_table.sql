-- Create player_stats table
CREATE TABLE public.player_stats (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    player_id TEXT NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    tournament_id TEXT REFERENCES public.tournaments(id) ON DELETE CASCADE,
    
    -- Batting Stats
    at_bats INTEGER DEFAULT 0,
    runs INTEGER DEFAULT 0,
    hits INTEGER DEFAULT 0,
    h2 INTEGER DEFAULT 0,
    h3 INTEGER DEFAULT 0,
    hr INTEGER DEFAULT 0,
    rbi INTEGER DEFAULT 0,
    bb INTEGER DEFAULT 0,
    so INTEGER DEFAULT 0,
    hbp INTEGER DEFAULT 0,
    sac INTEGER DEFAULT 0,
    
    -- Pitching Stats
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    ip_outs INTEGER DEFAULT 0,
    h_allowed INTEGER DEFAULT 0,
    er_allowed INTEGER DEFAULT 0,
    bb_allowed INTEGER DEFAULT 0,
    so_pitching INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to allow upserting per player/team/tournament combination
    UNIQUE(player_id, team_id, tournament_id)
);

-- Enable RLS
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.player_stats FOR SELECT USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.player_stats FOR ALL USING (auth.role() = 'authenticated');

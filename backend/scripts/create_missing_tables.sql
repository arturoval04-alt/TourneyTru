-- ============================================================
-- create_missing_tables.sql
-- Ejecutar en SSMS sobre la base TourneyManager
-- Crea las 3 tablas que no están en SQL Server todavía
-- ============================================================

USE TourneyManager;
GO

-- ── 1. game_umpires (debía crearse en migration 1 pero falló) ──────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'game_umpires')
BEGIN
    CREATE TABLE [dbo].[game_umpires] (
        [id]         NVARCHAR(1000) NOT NULL,
        [role]       NVARCHAR(1000) NOT NULL CONSTRAINT [game_umpires_role_df] DEFAULT 'plate',
        [game_id]    NVARCHAR(1000) NOT NULL,
        [umpire_id]  NVARCHAR(1000) NOT NULL,
        [created_at] DATETIME2 NOT NULL CONSTRAINT [game_umpires_created_at_df] DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT [game_umpires_pkey]            PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [game_umpires_game_umpire_key] UNIQUE NONCLUSTERED ([game_id], [umpire_id]),

        CONSTRAINT [game_umpires_game_id_fkey]
            FOREIGN KEY ([game_id])   REFERENCES [dbo].[games]([id])   ON DELETE CASCADE,
        CONSTRAINT [game_umpires_umpire_id_fkey]
            FOREIGN KEY ([umpire_id]) REFERENCES [dbo].[umpires]([id]) ON DELETE CASCADE
    );
    PRINT '✔ game_umpires creada';
END
ELSE
    PRINT '– game_umpires ya existe, se omite';
GO

-- ── 2. player_stats ───────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'player_stats')
BEGIN
    CREATE TABLE [dbo].[player_stats] (
        [id]            NVARCHAR(1000) NOT NULL,
        [player_id]     NVARCHAR(1000) NOT NULL,
        [team_id]       NVARCHAR(1000) NOT NULL,
        [tournament_id] NVARCHAR(1000),

        -- Batting
        [at_bats]   INT NOT NULL CONSTRAINT [ps_at_bats_df]   DEFAULT 0,
        [runs]      INT NOT NULL CONSTRAINT [ps_runs_df]      DEFAULT 0,
        [hits]      INT NOT NULL CONSTRAINT [ps_hits_df]      DEFAULT 0,
        [h2]        INT NOT NULL CONSTRAINT [ps_h2_df]        DEFAULT 0,
        [h3]        INT NOT NULL CONSTRAINT [ps_h3_df]        DEFAULT 0,
        [hr]        INT NOT NULL CONSTRAINT [ps_hr_df]        DEFAULT 0,
        [rbi]       INT NOT NULL CONSTRAINT [ps_rbi_df]       DEFAULT 0,
        [bb]        INT NOT NULL CONSTRAINT [ps_bb_df]        DEFAULT 0,
        [so]        INT NOT NULL CONSTRAINT [ps_so_df]        DEFAULT 0,
        [hbp]       INT NOT NULL CONSTRAINT [ps_hbp_df]       DEFAULT 0,
        [sac]       INT NOT NULL CONSTRAINT [ps_sac_df]       DEFAULT 0,

        -- Pitching
        [wins]        INT NOT NULL CONSTRAINT [ps_wins_df]        DEFAULT 0,
        [losses]      INT NOT NULL CONSTRAINT [ps_losses_df]      DEFAULT 0,
        [ip_outs]     INT NOT NULL CONSTRAINT [ps_ip_outs_df]     DEFAULT 0,
        [h_allowed]   INT NOT NULL CONSTRAINT [ps_h_allowed_df]   DEFAULT 0,
        [er_allowed]  INT NOT NULL CONSTRAINT [ps_er_allowed_df]  DEFAULT 0,
        [bb_allowed]  INT NOT NULL CONSTRAINT [ps_bb_allowed_df]  DEFAULT 0,
        [so_pitching] INT NOT NULL CONSTRAINT [ps_so_pitching_df] DEFAULT 0,

        [created_at] DATETIME2 NOT NULL CONSTRAINT [ps_created_at_df] DEFAULT CURRENT_TIMESTAMP,
        [updated_at] DATETIME2 NOT NULL CONSTRAINT [ps_updated_at_df] DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT [player_stats_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [player_stats_unique] UNIQUE NONCLUSTERED ([player_id], [team_id], [tournament_id]),

        CONSTRAINT [ps_player_id_fkey]
            FOREIGN KEY ([player_id])     REFERENCES [dbo].[players]([id])     ON DELETE CASCADE,
        CONSTRAINT [ps_team_id_fkey]
            FOREIGN KEY ([team_id])       REFERENCES [dbo].[teams]([id])       ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [ps_tournament_id_fkey]
            FOREIGN KEY ([tournament_id]) REFERENCES [dbo].[tournaments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );
    PRINT '✔ player_stats creada';
END
ELSE
    PRINT '– player_stats ya existe, se omite';
GO

-- ── 3. tournament_news ────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tournament_news')
BEGIN
    CREATE TABLE [dbo].[tournament_news] (
        [id]            NVARCHAR(1000) NOT NULL,
        [tournament_id] NVARCHAR(1000) NOT NULL,
        [author_id]     NVARCHAR(1000),
        [title]         NVARCHAR(1000) NOT NULL,
        [description]   NVARCHAR(MAX),
        [cover_url]     NVARCHAR(1000),
        [facebook_url]  NVARCHAR(1000),
        [type]          NVARCHAR(100) NOT NULL CONSTRAINT [tn_type_df] DEFAULT 'Noticia',
        [has_video]     BIT NOT NULL CONSTRAINT [tn_has_video_df] DEFAULT 0,
        [created_at]    DATETIME2 NOT NULL CONSTRAINT [tn_created_at_df] DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT [tournament_news_pkey] PRIMARY KEY CLUSTERED ([id]),

        CONSTRAINT [tn_tournament_id_fkey]
            FOREIGN KEY ([tournament_id]) REFERENCES [dbo].[tournaments]([id]) ON DELETE CASCADE,
        CONSTRAINT [tn_author_id_fkey]
            FOREIGN KEY ([author_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );
    PRINT '✔ tournament_news creada';
END
ELSE
    PRINT '– tournament_news ya existe, se omite';
GO

PRINT '';
PRINT '✅ Script completado. Verifica las tablas en Object Explorer.';
GO

-- ============================================================
-- create_tourneytru_schema.sql
-- Ejecutar en SSMS conectado como sa o con usuario sysadmin
-- Crea la base de datos "tourneytru" con todas las tablas
-- ============================================================

-- ── Crear la base de datos ────────────────────────────────────────────────────

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'tourneytru')
BEGIN
    CREATE DATABASE tourneytru;
    PRINT '✔ Base de datos tourneytru creada';
END
ELSE
    PRINT '– tourneytru ya existe';
GO

USE tourneytru;
GO

-- ── Dar permisos al usuario de la app ─────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'vercel_db_tt')
BEGIN
    CREATE USER vercel_db_tt FOR LOGIN vercel_db_tt;
END
ALTER ROLE db_owner ADD MEMBER vercel_db_tt;
PRINT '✔ Permisos otorgados a vercel_db_tt';
GO

-- ── Tabla de migraciones de Prisma (requerida por Prisma) ─────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = '_prisma_migrations')
CREATE TABLE [dbo].[_prisma_migrations] (
    [id]                    VARCHAR(36)   NOT NULL PRIMARY KEY,
    [checksum]              VARCHAR(64)   NOT NULL,
    [finished_at]           DATETIMEOFFSET,
    [migration_name]        VARCHAR(255)  NOT NULL,
    [logs]                  NVARCHAR(MAX),
    [rolled_back_at]        DATETIMEOFFSET,
    [started_at]            DATETIMEOFFSET NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [applied_steps_count]   INT NOT NULL DEFAULT 0
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ROLES
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'roles')
CREATE TABLE [dbo].[roles] (
    [id]   NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [roles_pkey]     PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [roles_name_key] UNIQUE NONCLUSTERED ([name])
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. USERS
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
CREATE TABLE [dbo].[users] (
    [id]                    NVARCHAR(1000) NOT NULL,
    [email]                 NVARCHAR(1000) NOT NULL,
    [password_hash]         NVARCHAR(1000) NOT NULL,
    [first_name]            NVARCHAR(1000) NOT NULL,
    [last_name]             NVARCHAR(1000) NOT NULL,
    [phone]                 NVARCHAR(1000),
    [profile_picture]       NVARCHAR(1000),
    [role_id]               NVARCHAR(1000) NOT NULL,
    [password_reset_token]  NVARCHAR(1000),
    [password_reset_expiry] DATETIME2,
    [created_at]            DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at]            DATETIME2 NOT NULL CONSTRAINT [users_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [users_pkey]      PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [users_role_id_fkey] FOREIGN KEY ([role_id]) REFERENCES [dbo].[roles]([id]) ON DELETE NO ACTION ON UPDATE CASCADE
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. LEAGUES
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'leagues')
CREATE TABLE [dbo].[leagues] (
    [id]         NVARCHAR(1000) NOT NULL,
    [name]       NVARCHAR(1000) NOT NULL,
    [logo_url]   NVARCHAR(1000),
    [admin_id]   NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [leagues_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [leagues_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [leagues_pkey]        PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [leagues_admin_id_fkey] FOREIGN KEY ([admin_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE CASCADE
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TOURNAMENTS
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tournaments')
CREATE TABLE [dbo].[tournaments] (
    [id]             NVARCHAR(1000) NOT NULL,
    [name]           NVARCHAR(1000) NOT NULL,
    [season]         NVARCHAR(1000) NOT NULL,
    [description]    NVARCHAR(MAX),
    [category]       NVARCHAR(1000),
    [logo_url]       NVARCHAR(1000),
    [rules_type]     NVARCHAR(1000) NOT NULL CONSTRAINT [tournaments_rules_type_df] DEFAULT 'baseball_9',
    [admin_id]       NVARCHAR(1000) NOT NULL,
    [league_id]      NVARCHAR(1000) NOT NULL,
    [location_city]  NVARCHAR(1000),
    [location_state] NVARCHAR(1000),
    [created_at]     DATETIME2 NOT NULL CONSTRAINT [tournaments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tournaments_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tournaments_league_id_fkey] FOREIGN KEY ([league_id]) REFERENCES [dbo].[leagues]([id]) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT [tournaments_admin_id_fkey]  FOREIGN KEY ([admin_id])  REFERENCES [dbo].[users]([id])   ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TOURNAMENT_ORGANIZERS
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tournament_organizers')
CREATE TABLE [dbo].[tournament_organizers] (
    [id]            NVARCHAR(1000) NOT NULL,
    [tournament_id] NVARCHAR(1000) NOT NULL,
    [user_id]       NVARCHAR(1000) NOT NULL,
    [created_at]    DATETIME2 NOT NULL CONSTRAINT [to_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tournament_organizers_pkey]   PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tournament_organizers_unique] UNIQUE NONCLUSTERED ([tournament_id], [user_id]),
    CONSTRAINT [to_tournament_id_fkey] FOREIGN KEY ([tournament_id]) REFERENCES [dbo].[tournaments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [to_user_id_fkey]       FOREIGN KEY ([user_id])       REFERENCES [dbo].[users]([id])       ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. FIELDS
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'fields')
CREATE TABLE [dbo].[fields] (
    [id]            NVARCHAR(1000) NOT NULL,
    [name]          NVARCHAR(1000) NOT NULL,
    [location]      NVARCHAR(1000),
    [tournament_id] NVARCHAR(1000) NOT NULL,
    [created_at]    DATETIME2 NOT NULL CONSTRAINT [fields_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [fields_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [fields_tournament_id_fkey] FOREIGN KEY ([tournament_id]) REFERENCES [dbo].[tournaments]([id]) ON DELETE CASCADE ON UPDATE CASCADE
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. TEAMS
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'teams')
CREATE TABLE [dbo].[teams] (
    [id]            NVARCHAR(1000) NOT NULL,
    [name]          NVARCHAR(1000) NOT NULL,
    [short_name]    NVARCHAR(1000),
    [logo_url]      NVARCHAR(1000),
    [manager_name]  NVARCHAR(1000),
    [tournament_id] NVARCHAR(1000) NOT NULL,
    [home_field_id] NVARCHAR(1000),
    [created_at]    DATETIME2 NOT NULL CONSTRAINT [teams_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [teams_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [teams_tournament_id_fkey] FOREIGN KEY ([tournament_id]) REFERENCES [dbo].[tournaments]([id]) ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT [teams_home_field_id_fkey] FOREIGN KEY ([home_field_id]) REFERENCES [dbo].[fields]([id])      ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. PLAYERS
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'players')
CREATE TABLE [dbo].[players] (
    [id]         NVARCHAR(1000) NOT NULL,
    [first_name] NVARCHAR(1000) NOT NULL,
    [last_name]  NVARCHAR(1000) NOT NULL,
    [number]     INT,
    [position]   NVARCHAR(1000),
    [photo_url]  NVARCHAR(1000),
    [bats]       NVARCHAR(10) CONSTRAINT [players_bats_df]   DEFAULT 'R',
    [throws]     NVARCHAR(10) CONSTRAINT [players_throws_df] DEFAULT 'R',
    [team_id]    NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [players_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [players_pkey]        PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [players_team_id_fkey] FOREIGN KEY ([team_id]) REFERENCES [dbo].[teams]([id]) ON DELETE CASCADE ON UPDATE CASCADE
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. UMPIRES
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'umpires')
CREATE TABLE [dbo].[umpires] (
    [id]         NVARCHAR(1000) NOT NULL,
    [first_name] NVARCHAR(1000) NOT NULL,
    [last_name]  NVARCHAR(1000) NOT NULL,
    [league_id]  NVARCHAR(1000) NOT NULL,
    CONSTRAINT [umpires_pkey]          PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [umpires_league_id_fkey] FOREIGN KEY ([league_id]) REFERENCES [dbo].[leagues]([id]) ON DELETE CASCADE ON UPDATE CASCADE
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. GAMES
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'games')
CREATE TABLE [dbo].[games] (
    [id]               NVARCHAR(1000) NOT NULL,
    [field]            NVARCHAR(1000),
    [scheduled_date]   DATETIME2 NOT NULL,
    [start_time]       DATETIME2,
    [end_time]         DATETIME2,
    [status]           NVARCHAR(1000) NOT NULL CONSTRAINT [games_status_df]         DEFAULT 'scheduled',
    [home_score]       INT           NOT NULL CONSTRAINT [games_home_score_df]      DEFAULT 0,
    [away_score]       INT           NOT NULL CONSTRAINT [games_away_score_df]      DEFAULT 0,
    [current_inning]   INT           NOT NULL CONSTRAINT [games_current_inning_df]  DEFAULT 1,
    [half]             NVARCHAR(10)  NOT NULL CONSTRAINT [games_half_df]            DEFAULT 'top',
    [tournament_id]    NVARCHAR(1000) NOT NULL,
    [home_team_id]     NVARCHAR(1000) NOT NULL,
    [away_team_id]     NVARCHAR(1000) NOT NULL,
    [winning_pitcher_id] NVARCHAR(1000),
    [mvp_batter1_id]   NVARCHAR(1000),
    [mvp_batter2_id]   NVARCHAR(1000),
    [created_at]       DATETIME2 NOT NULL CONSTRAINT [games_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [games_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [games_tournament_id_fkey]     FOREIGN KEY ([tournament_id])     REFERENCES [dbo].[tournaments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [games_home_team_id_fkey]      FOREIGN KEY ([home_team_id])      REFERENCES [dbo].[teams]([id])       ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [games_away_team_id_fkey]      FOREIGN KEY ([away_team_id])      REFERENCES [dbo].[teams]([id])       ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [games_winning_pitcher_id_fkey] FOREIGN KEY ([winning_pitcher_id]) REFERENCES [dbo].[players]([id])   ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [games_mvp_batter1_id_fkey]    FOREIGN KEY ([mvp_batter1_id])    REFERENCES [dbo].[players]([id])     ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [games_mvp_batter2_id_fkey]    FOREIGN KEY ([mvp_batter2_id])    REFERENCES [dbo].[players]([id])     ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. GAME_UMPIRES
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'game_umpires')
CREATE TABLE [dbo].[game_umpires] (
    [id]         NVARCHAR(1000) NOT NULL,
    [role]       NVARCHAR(100)  NOT NULL CONSTRAINT [game_umpires_role_df] DEFAULT 'plate',
    [game_id]    NVARCHAR(1000) NOT NULL,
    [umpire_id]  NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [game_umpires_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [game_umpires_pkey]   PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [game_umpires_unique] UNIQUE NONCLUSTERED ([game_id], [umpire_id]),
    CONSTRAINT [game_umpires_game_id_fkey]   FOREIGN KEY ([game_id])   REFERENCES [dbo].[games]([id])   ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT [game_umpires_umpire_id_fkey] FOREIGN KEY ([umpire_id]) REFERENCES [dbo].[umpires]([id]) ON DELETE CASCADE ON UPDATE CASCADE
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. LINEUPS
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lineups')
CREATE TABLE [dbo].[lineups] (
    [id]              NVARCHAR(1000) NOT NULL,
    [batting_order]   INT            NOT NULL,
    [position]        NVARCHAR(10)   NOT NULL,
    [dh_for_position] NVARCHAR(10),
    [is_starter]      BIT            NOT NULL CONSTRAINT [lineups_is_starter_df] DEFAULT 1,
    [game_id]         NVARCHAR(1000) NOT NULL,
    [team_id]         NVARCHAR(1000) NOT NULL,
    [player_id]       NVARCHAR(1000) NOT NULL,
    [created_at]      DATETIME2 NOT NULL CONSTRAINT [lineups_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [lineups_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [lineups_game_id_fkey]   FOREIGN KEY ([game_id])   REFERENCES [dbo].[games]([id])   ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT [lineups_team_id_fkey]   FOREIGN KEY ([team_id])   REFERENCES [dbo].[teams]([id])   ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [lineups_player_id_fkey] FOREIGN KEY ([player_id]) REFERENCES [dbo].[players]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. LINEUP_CHANGES
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lineup_changes')
CREATE TABLE [dbo].[lineup_changes] (
    [id]              NVARCHAR(1000) NOT NULL,
    [batting_order]   INT            NOT NULL,
    [position]        NVARCHAR(10)   NOT NULL,
    [dh_for_position] NVARCHAR(10),
    [game_id]         NVARCHAR(1000) NOT NULL,
    [team_id]         NVARCHAR(1000) NOT NULL,
    [player_out_id]   NVARCHAR(1000),
    [player_in_id]    NVARCHAR(1000) NOT NULL,
    [created_at]      DATETIME2 NOT NULL CONSTRAINT [lc_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [lineup_changes_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [lc_game_id_fkey]      FOREIGN KEY ([game_id])      REFERENCES [dbo].[games]([id])   ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT [lc_team_id_fkey]      FOREIGN KEY ([team_id])      REFERENCES [dbo].[teams]([id])   ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [lc_player_out_id_fkey] FOREIGN KEY ([player_out_id]) REFERENCES [dbo].[players]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [lc_player_in_id_fkey]  FOREIGN KEY ([player_in_id])  REFERENCES [dbo].[players]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. PLAYS
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'plays')
CREATE TABLE [dbo].[plays] (
    [id]             NVARCHAR(1000) NOT NULL,
    [inning]         INT            NOT NULL,
    [half]           NVARCHAR(10)   NOT NULL,
    [outs_before_play] INT          NOT NULL,
    [result]         NVARCHAR(1000) NOT NULL,
    [rbi]            INT            NOT NULL CONSTRAINT [plays_rbi_df]          DEFAULT 0,
    [runs_scored]    INT            NOT NULL CONSTRAINT [plays_runs_scored_df]   DEFAULT 0,
    [outs_recorded]  INT            NOT NULL CONSTRAINT [plays_outs_recorded_df] DEFAULT 0,
    [game_id]        NVARCHAR(1000) NOT NULL,
    [batter_id]      NVARCHAR(1000) NOT NULL,
    [pitcher_id]     NVARCHAR(1000) NOT NULL,
    [timestamp]      DATETIME2 NOT NULL CONSTRAINT [plays_timestamp_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [plays_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [plays_game_id_fkey]    FOREIGN KEY ([game_id])    REFERENCES [dbo].[games]([id])   ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT [plays_batter_id_fkey]  FOREIGN KEY ([batter_id])  REFERENCES [dbo].[players]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [plays_pitcher_id_fkey] FOREIGN KEY ([pitcher_id]) REFERENCES [dbo].[players]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. PLAYER_STATS
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'player_stats')
CREATE TABLE [dbo].[player_stats] (
    [id]            NVARCHAR(1000) NOT NULL,
    [player_id]     NVARCHAR(1000) NOT NULL,
    [team_id]       NVARCHAR(1000) NOT NULL,
    [tournament_id] NVARCHAR(1000),
    [at_bats]       INT NOT NULL CONSTRAINT [ps_at_bats_df]    DEFAULT 0,
    [runs]          INT NOT NULL CONSTRAINT [ps_runs_df]        DEFAULT 0,
    [hits]          INT NOT NULL CONSTRAINT [ps_hits_df]        DEFAULT 0,
    [h2]            INT NOT NULL CONSTRAINT [ps_h2_df]          DEFAULT 0,
    [h3]            INT NOT NULL CONSTRAINT [ps_h3_df]          DEFAULT 0,
    [hr]            INT NOT NULL CONSTRAINT [ps_hr_df]          DEFAULT 0,
    [rbi]           INT NOT NULL CONSTRAINT [ps_rbi_df]         DEFAULT 0,
    [bb]            INT NOT NULL CONSTRAINT [ps_bb_df]          DEFAULT 0,
    [so]            INT NOT NULL CONSTRAINT [ps_so_df]          DEFAULT 0,
    [hbp]           INT NOT NULL CONSTRAINT [ps_hbp_df]         DEFAULT 0,
    [sac]           INT NOT NULL CONSTRAINT [ps_sac_df]         DEFAULT 0,
    [wins]          INT NOT NULL CONSTRAINT [ps_wins_df]        DEFAULT 0,
    [losses]        INT NOT NULL CONSTRAINT [ps_losses_df]      DEFAULT 0,
    [ip_outs]       INT NOT NULL CONSTRAINT [ps_ip_outs_df]     DEFAULT 0,
    [h_allowed]     INT NOT NULL CONSTRAINT [ps_h_allowed_df]   DEFAULT 0,
    [er_allowed]    INT NOT NULL CONSTRAINT [ps_er_allowed_df]  DEFAULT 0,
    [bb_allowed]    INT NOT NULL CONSTRAINT [ps_bb_allowed_df]  DEFAULT 0,
    [so_pitching]   INT NOT NULL CONSTRAINT [ps_so_pitching_df] DEFAULT 0,
    [created_at]    DATETIME2 NOT NULL CONSTRAINT [ps_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at]    DATETIME2 NOT NULL CONSTRAINT [ps_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [player_stats_pkey]   PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [player_stats_unique] UNIQUE NONCLUSTERED ([player_id], [team_id], [tournament_id]),
    CONSTRAINT [ps_player_id_fkey]     FOREIGN KEY ([player_id])     REFERENCES [dbo].[players]([id])     ON DELETE CASCADE   ON UPDATE CASCADE,
    CONSTRAINT [ps_team_id_fkey]       FOREIGN KEY ([team_id])       REFERENCES [dbo].[teams]([id])       ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [ps_tournament_id_fkey] FOREIGN KEY ([tournament_id]) REFERENCES [dbo].[tournaments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. TOURNAMENT_NEWS
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tournament_news')
CREATE TABLE [dbo].[tournament_news] (
    [id]            NVARCHAR(1000) NOT NULL,
    [tournament_id] NVARCHAR(1000) NOT NULL,
    [author_id]     NVARCHAR(1000),
    [title]         NVARCHAR(1000) NOT NULL,
    [description]   NVARCHAR(MAX),
    [cover_url]     NVARCHAR(1000),
    [facebook_url]  NVARCHAR(1000),
    [type]          NVARCHAR(100)  NOT NULL CONSTRAINT [tn_type_df]      DEFAULT 'Noticia',
    [has_video]     BIT            NOT NULL CONSTRAINT [tn_has_video_df] DEFAULT 0,
    [created_at]    DATETIME2 NOT NULL CONSTRAINT [tn_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tournament_news_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tn_tournament_id_fkey] FOREIGN KEY ([tournament_id]) REFERENCES [dbo].[tournaments]([id]) ON DELETE CASCADE   ON UPDATE CASCADE,
    CONSTRAINT [tn_author_id_fkey]     FOREIGN KEY ([author_id])     REFERENCES [dbo].[users]([id])       ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: Roles iniciales
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM [dbo].[roles])
BEGIN
    INSERT INTO [dbo].[roles] ([id], [name]) VALUES
        (LOWER(CONVERT(VARCHAR(36), NEWID())), 'admin'),
        (LOWER(CONVERT(VARCHAR(36), NEWID())), 'scorekeeper'),
        (LOWER(CONVERT(VARCHAR(36), NEWID())), 'public');
    PRINT '✔ Roles iniciales insertados';
END
GO

PRINT '';
PRINT '✅ Schema completo creado en tourneytru (16 tablas + roles seed)';
GO

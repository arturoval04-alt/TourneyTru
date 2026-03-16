BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password_hash] NVARCHAR(1000) NOT NULL,
    [first_name] NVARCHAR(1000) NOT NULL,
    [last_name] NVARCHAR(1000) NOT NULL,
    [role_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[roles] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [roles_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[leagues] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [logo_url] NVARCHAR(1000),
    [admin_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [leagues_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [leagues_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[tournaments] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [season] NVARCHAR(1000) NOT NULL,
    [rules_type] NVARCHAR(1000) NOT NULL CONSTRAINT [tournaments_rules_type_df] DEFAULT 'baseball_9',
    [league_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [tournaments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tournaments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[teams] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [short_name] NVARCHAR(1000),
    [logo_url] NVARCHAR(1000),
    [tournament_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [teams_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [teams_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[players] (
    [id] NVARCHAR(1000) NOT NULL,
    [first_name] NVARCHAR(1000) NOT NULL,
    [last_name] NVARCHAR(1000) NOT NULL,
    [number] INT,
    [position] NVARCHAR(1000),
    [bats] NVARCHAR(1000) CONSTRAINT [players_bats_df] DEFAULT 'R',
    [throws] NVARCHAR(1000) CONSTRAINT [players_throws_df] DEFAULT 'R',
    [team_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [players_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [players_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[umpires] (
    [id] NVARCHAR(1000) NOT NULL,
    [first_name] NVARCHAR(1000) NOT NULL,
    [last_name] NVARCHAR(1000) NOT NULL,
    [league_id] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [umpires_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[games] (
    [id] NVARCHAR(1000) NOT NULL,
    [field] NVARCHAR(1000),
    [scheduled_date] DATETIME2 NOT NULL,
    [start_time] DATETIME2,
    [end_time] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [games_status_df] DEFAULT 'scheduled',
    [home_score] INT NOT NULL CONSTRAINT [games_home_score_df] DEFAULT 0,
    [away_score] INT NOT NULL CONSTRAINT [games_away_score_df] DEFAULT 0,
    [current_inning] INT NOT NULL CONSTRAINT [games_current_inning_df] DEFAULT 1,
    [half] NVARCHAR(1000) NOT NULL CONSTRAINT [games_half_df] DEFAULT 'top',
    [tournament_id] NVARCHAR(1000) NOT NULL,
    [home_team_id] NVARCHAR(1000) NOT NULL,
    [away_team_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [games_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [games_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[lineups] (
    [id] NVARCHAR(1000) NOT NULL,
    [batting_order] INT NOT NULL,
    [position] NVARCHAR(1000) NOT NULL,
    [is_starter] BIT NOT NULL CONSTRAINT [lineups_is_starter_df] DEFAULT 1,
    [game_id] NVARCHAR(1000) NOT NULL,
    [team_id] NVARCHAR(1000) NOT NULL,
    [player_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [lineups_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [lineups_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[plays] (
    [id] NVARCHAR(1000) NOT NULL,
    [inning] INT NOT NULL,
    [half] NVARCHAR(1000) NOT NULL,
    [outs_before_play] INT NOT NULL,
    [result] NVARCHAR(1000) NOT NULL,
    [rbi] INT NOT NULL CONSTRAINT [plays_rbi_df] DEFAULT 0,
    [runs_scored] INT NOT NULL CONSTRAINT [plays_runs_scored_df] DEFAULT 0,
    [outs_recorded] INT NOT NULL CONSTRAINT [plays_outs_recorded_df] DEFAULT 0,
    [game_id] NVARCHAR(1000) NOT NULL,
    [batter_id] NVARCHAR(1000) NOT NULL,
    [pitcher_id] NVARCHAR(1000) NOT NULL,
    [timestamp] DATETIME2 NOT NULL CONSTRAINT [plays_timestamp_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [plays_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[users] ADD CONSTRAINT [users_role_id_fkey] FOREIGN KEY ([role_id]) REFERENCES [dbo].[roles]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[leagues] ADD CONSTRAINT [leagues_admin_id_fkey] FOREIGN KEY ([admin_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[tournaments] ADD CONSTRAINT [tournaments_league_id_fkey] FOREIGN KEY ([league_id]) REFERENCES [dbo].[leagues]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[teams] ADD CONSTRAINT [teams_tournament_id_fkey] FOREIGN KEY ([tournament_id]) REFERENCES [dbo].[tournaments]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[players] ADD CONSTRAINT [players_team_id_fkey] FOREIGN KEY ([team_id]) REFERENCES [dbo].[teams]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[umpires] ADD CONSTRAINT [umpires_league_id_fkey] FOREIGN KEY ([league_id]) REFERENCES [dbo].[leagues]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[games] ADD CONSTRAINT [games_tournament_id_fkey] FOREIGN KEY ([tournament_id]) REFERENCES [dbo].[tournaments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[games] ADD CONSTRAINT [games_home_team_id_fkey] FOREIGN KEY ([home_team_id]) REFERENCES [dbo].[teams]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[games] ADD CONSTRAINT [games_away_team_id_fkey] FOREIGN KEY ([away_team_id]) REFERENCES [dbo].[teams]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[lineups] ADD CONSTRAINT [lineups_game_id_fkey] FOREIGN KEY ([game_id]) REFERENCES [dbo].[games]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[lineups] ADD CONSTRAINT [lineups_team_id_fkey] FOREIGN KEY ([team_id]) REFERENCES [dbo].[teams]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[lineups] ADD CONSTRAINT [lineups_player_id_fkey] FOREIGN KEY ([player_id]) REFERENCES [dbo].[players]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[plays] ADD CONSTRAINT [plays_game_id_fkey] FOREIGN KEY ([game_id]) REFERENCES [dbo].[games]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[plays] ADD CONSTRAINT [plays_batter_id_fkey] FOREIGN KEY ([batter_id]) REFERENCES [dbo].[players]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[plays] ADD CONSTRAINT [plays_pitcher_id_fkey] FOREIGN KEY ([pitcher_id]) REFERENCES [dbo].[players]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

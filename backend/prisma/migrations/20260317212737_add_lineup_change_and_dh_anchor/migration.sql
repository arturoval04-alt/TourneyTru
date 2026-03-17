BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[lineups] ADD [dh_for_position] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[lineup_changes] (
    [id] NVARCHAR(1000) NOT NULL,
    [batting_order] INT NOT NULL,
    [position] NVARCHAR(1000) NOT NULL,
    [dh_for_position] NVARCHAR(1000),
    [game_id] NVARCHAR(1000) NOT NULL,
    [team_id] NVARCHAR(1000) NOT NULL,
    [player_out_id] NVARCHAR(1000),
    [player_in_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [lineup_changes_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [lineup_changes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[lineup_changes] ADD CONSTRAINT [lineup_changes_game_id_fkey] FOREIGN KEY ([game_id]) REFERENCES [dbo].[games]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[lineup_changes] ADD CONSTRAINT [lineup_changes_team_id_fkey] FOREIGN KEY ([team_id]) REFERENCES [dbo].[teams]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[lineup_changes] ADD CONSTRAINT [lineup_changes_player_out_id_fkey] FOREIGN KEY ([player_out_id]) REFERENCES [dbo].[players]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[lineup_changes] ADD CONSTRAINT [lineup_changes_player_in_id_fkey] FOREIGN KEY ([player_in_id]) REFERENCES [dbo].[players]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

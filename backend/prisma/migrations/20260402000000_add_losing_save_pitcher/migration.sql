-- AlterTable: Add losingPitcherId and savePitcherId to games
ALTER TABLE [dbo].[games] ADD [losing_pitcher_id] NVARCHAR(1000);
ALTER TABLE [dbo].[games] ADD [save_pitcher_id] NVARCHAR(1000);

-- AddForeignKey: losing_pitcher_id -> players
ALTER TABLE [dbo].[games] ADD CONSTRAINT [games_losing_pitcher_id_fkey]
  FOREIGN KEY ([losing_pitcher_id]) REFERENCES [dbo].[players]([id])
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: save_pitcher_id -> players
ALTER TABLE [dbo].[games] ADD CONSTRAINT [games_save_pitcher_id_fkey]
  FOREIGN KEY ([save_pitcher_id]) REFERENCES [dbo].[players]([id])
  ON DELETE NO ACTION ON UPDATE NO ACTION;

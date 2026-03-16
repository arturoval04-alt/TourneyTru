/*
  Warnings:

  - Added the required column `admin_id` to the `tournaments` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[games] ADD [mvp_batter1_id] NVARCHAR(1000),
[mvp_batter2_id] NVARCHAR(1000),
[winning_pitcher_id] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[players] ADD [photo_url] NVARCHAR(max);

-- AlterTable
ALTER TABLE [dbo].[teams] ALTER COLUMN [logo_url] NVARCHAR(max) NULL;
ALTER TABLE [dbo].[teams] ADD [home_field_id] NVARCHAR(1000),
[manager_name] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[tournaments] ADD [admin_id] NVARCHAR(1000) NOT NULL,
[category] NVARCHAR(1000),
[description] NVARCHAR(max),
[location_city] NVARCHAR(1000),
[location_state] NVARCHAR(1000),
[logo_url] NVARCHAR(max);

-- AlterTable
ALTER TABLE [dbo].[users] ADD [phone] NVARCHAR(1000),
[profile_picture] NVARCHAR(max);

-- CreateTable
CREATE TABLE [dbo].[tournament_organizers] (
    [id] NVARCHAR(1000) NOT NULL,
    [tournament_id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [tournament_organizers_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tournament_organizers_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tournament_organizers_tournament_id_user_id_key] UNIQUE NONCLUSTERED ([tournament_id],[user_id])
);

-- CreateTable
CREATE TABLE [dbo].[fields] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [location] NVARCHAR(1000),
    [tournament_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [fields_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [fields_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[tournaments] ADD CONSTRAINT [tournaments_admin_id_fkey] FOREIGN KEY ([admin_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tournament_organizers] ADD CONSTRAINT [tournament_organizers_tournament_id_fkey] FOREIGN KEY ([tournament_id]) REFERENCES [dbo].[tournaments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tournament_organizers] ADD CONSTRAINT [tournament_organizers_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[fields] ADD CONSTRAINT [fields_tournament_id_fkey] FOREIGN KEY ([tournament_id]) REFERENCES [dbo].[tournaments]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[teams] ADD CONSTRAINT [teams_home_field_id_fkey] FOREIGN KEY ([home_field_id]) REFERENCES [dbo].[fields]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[games] ADD CONSTRAINT [games_winning_pitcher_id_fkey] FOREIGN KEY ([winning_pitcher_id]) REFERENCES [dbo].[players]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[games] ADD CONSTRAINT [games_mvp_batter1_id_fkey] FOREIGN KEY ([mvp_batter1_id]) REFERENCES [dbo].[players]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[games] ADD CONSTRAINT [games_mvp_batter2_id_fkey] FOREIGN KEY ([mvp_batter2_id]) REFERENCES [dbo].[players]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

-- =========================================================
-- Script: Crear juego SNTE 53 vs Tacos El Zurdo
-- con lineups completos, listo para usar el Scorekeeper
-- Campo: Campo Agrónomo
-- =========================================================

DECLARE @tournamentId NVARCHAR(1000);
DECLARE @team1Id NVARCHAR(1000);  -- Tacos El Zurdo (AWAY)
DECLARE @team2Id NVARCHAR(1000);  -- SNTE 53 (HOME)
DECLARE @gameId NVARCHAR(1000) = LOWER(CONVERT(VARCHAR(36), NEWID()));

-- Buscar torneo
SELECT TOP 1 @tournamentId = id FROM tournaments WHERE name LIKE '%Pollo Fierro%';

-- Buscar equipos
SELECT TOP 1 @team1Id = id FROM teams WHERE name LIKE '%Tacos%Zurdo%' AND tournament_id = @tournamentId;
SELECT TOP 1 @team2Id = id FROM teams WHERE name LIKE '%SNTE%' AND tournament_id = @tournamentId;

IF @tournamentId IS NULL OR @team1Id IS NULL OR @team2Id IS NULL
BEGIN
    PRINT 'ERROR: No se encontró torneo o equipos.';
    PRINT 'Torneo: ' + ISNULL(@tournamentId, 'NULL');
    PRINT 'Tacos El Zurdo: ' + ISNULL(@team1Id, 'NULL');
    PRINT 'SNTE 53: ' + ISNULL(@team2Id, 'NULL');
    THROW 51000, 'Equipos o torneo no encontrados. Ejecuta seed_softbol.sql primero.', 1;
END

-- =========================================================
-- 1. CREAR EL JUEGO
-- =========================================================
INSERT INTO games (id, field, scheduled_date, status, home_score, away_score, current_inning, half, tournament_id, home_team_id, away_team_id)
VALUES (
    @gameId,
    'Campo Agrónomo',
    GETDATE(),
    'in_progress',
    0, 0, 1, 'top',
    @tournamentId,
    @team2Id,    -- SNTE 53 = HOME
    @team1Id     -- Tacos El Zurdo = AWAY
);

-- =========================================================
-- 2. LINEUP - TACOS EL ZURDO (AWAY)
-- Orden: Esteban, Cristian, David, Flavio, Juan Pablo,
--         Paul, Jesús Pablo, José Luis, Arturo, Julio (pitcher)
-- =========================================================
-- Jugador 1: Esteban Quiñónez - RF
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 1, '9', 1, @gameId, @team1Id, id
FROM players WHERE first_name = 'Esteban' AND team_id = @team1Id;

-- Jugador 2: Cristian Gamboa - CF
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 2, '8', 1, @gameId, @team1Id, id
FROM players WHERE first_name = 'Cristian' AND team_id = @team1Id;

-- Jugador 3: David González - 2B
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 3, '4', 1, @gameId, @team1Id, id
FROM players WHERE first_name = 'David' AND team_id = @team1Id;

-- Jugador 4: Flavio Luque - 3B
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 4, '5', 1, @gameId, @team1Id, id
FROM players WHERE first_name = 'Flavio' AND team_id = @team1Id;

-- Jugador 5: Juan Pablo Córdova - 1B
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 5, '3', 1, @gameId, @team1Id, id
FROM players WHERE first_name = 'Juan Pablo' AND team_id = @team1Id;

-- Jugador 6: Paul Gamboa - SS
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 6, '6', 1, @gameId, @team1Id, id
FROM players WHERE first_name = 'Paul' AND team_id = @team1Id;

-- Jugador 7: Jesús Pablo Córdova - C
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 7, '2', 1, @gameId, @team1Id, id
FROM players WHERE first_name LIKE 'Jes_s Pablo' AND team_id = @team1Id;

-- Jugador 8: José Luis Patiño - DH
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 8, '10', 1, @gameId, @team1Id, id
FROM players WHERE first_name = 'José Luis' AND team_id = @team1Id;

-- Jugador 9: Arturo Valdez - LF
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 9, '7', 1, @gameId, @team1Id, id
FROM players WHERE first_name = 'Arturo' AND team_id = @team1Id;

-- Jugador 10: Julio César Zamarripa - P
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 10, '1', 1, @gameId, @team1Id, id
FROM players WHERE first_name = 'Julio César' AND team_id = @team1Id;

-- =========================================================
-- 3. LINEUP - SNTE 53 (HOME)
-- Orden: Jaime, Juan M., Omar, José de J., Manuel Cota,
--         Jesús Zavala, Heriberto, Manuel Mexía, Ramsés, Luis (pitcher)
-- =========================================================
-- Jugador 1: Jaime Lugo Peñuelas - RF
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 1, '9', 1, @gameId, @team2Id, id
FROM players WHERE first_name = 'Jaime' AND team_id = @team2Id;

-- Jugador 2: Juan M. Valenzuela - CF
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 2, '8', 1, @gameId, @team2Id, id
FROM players WHERE first_name = 'Juan M.' AND team_id = @team2Id;

-- Jugador 3: Omar Mayorquín - LF
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 3, '7', 1, @gameId, @team2Id, id
FROM players WHERE first_name = 'Omar' AND team_id = @team2Id;

-- Jugador 4: José de J. Cuadras - SS
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 4, '6', 1, @gameId, @team2Id, id
FROM players WHERE first_name = 'José de J.' AND team_id = @team2Id;

-- Jugador 5: Manuel Cota Rábago - 3B
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 5, '5', 1, @gameId, @team2Id, id
FROM players WHERE first_name = 'Manuel' AND last_name = 'Cota Rábago' AND team_id = @team2Id;

-- Jugador 6: Jesús Zavala Arce - 2B
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 6, '4', 1, @gameId, @team2Id, id
FROM players WHERE first_name = 'Jesús' AND last_name = 'Zavala Arce' AND team_id = @team2Id;

-- Jugador 7: Heriberto Pacheco - C
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 7, '2', 1, @gameId, @team2Id, id
FROM players WHERE first_name = 'Heriberto' AND team_id = @team2Id;

-- Jugador 8: Manuel Mexía Félix - 1B
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 8, '3', 1, @gameId, @team2Id, id
FROM players WHERE first_name = 'Manuel' AND last_name LIKE 'Mex%a F%lix' AND team_id = @team2Id;

-- Jugador 9: Ramsés Ruiz V. - DH
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 9, '10', 1, @gameId, @team2Id, id
FROM players WHERE first_name = 'Ramsés' AND team_id = @team2Id;

-- Jugador 10: Luis Mexía Félix - P (pitcher)
INSERT INTO lineups (id, batting_order, position, is_starter, game_id, team_id, player_id)
SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), 10, '1', 1, @gameId, @team2Id, id
FROM players WHERE first_name = 'Luis' AND team_id = @team2Id;

-- =========================================================
-- RESULTADO
-- =========================================================
PRINT '✅ Juego creado exitosamente!';
PRINT 'Game ID: ' + @gameId;
PRINT 'Home: SNTE 53 | Away: Tacos El Zurdo';
PRINT 'Campo: Campo Agrónomo';
PRINT '';
PRINT 'URL del Scorekeeper:';
PRINT '  /game/' + @gameId;
PRINT '';
PRINT 'URL del Gamecast:';
PRINT '  /gamecast/' + @gameId;

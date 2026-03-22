DECLARE @adminId NVARCHAR(1000);
-- Buscar tu usuario para asignarlo como admin de la liga y torneo
SELECT @adminId = id FROM users WHERE email = 'arturoval04@gmail.com';

IF @adminId IS NOT NULL
BEGIN
    DECLARE @leagueId NVARCHAR(1000) = LOWER(CONVERT(VARCHAR(36), NEWID()));
    DECLARE @tournamentId NVARCHAR(1000) = LOWER(CONVERT(VARCHAR(36), NEWID()));
    DECLARE @team1Id NVARCHAR(1000) = LOWER(CONVERT(VARCHAR(36), NEWID()));
    DECLARE @team2Id NVARCHAR(1000) = LOWER(CONVERT(VARCHAR(36), NEWID()));

    -- =========================================================
    -- 1. LIGA
    -- =========================================================
    INSERT INTO leagues (id, name, admin_id)
    VALUES (@leagueId, 'LIGA MUNICIPAL DE SOFTBOL DE AHOME', @adminId);
    
    -- =========================================================
    -- 2. TORNEO
    -- =========================================================
    INSERT INTO tournaments (id, name, season, rules_type, admin_id, league_id)
    VALUES (@tournamentId, 'Torneo "Pollo Fierro" LMSA', '2026', 'softball_7', @adminId, @leagueId);
    
    -- =========================================================
    -- 3. EQUIPOS
    -- =========================================================
    INSERT INTO teams (id, name, tournament_id)
    VALUES (@team1Id, 'Tacos El Zurdo', @tournamentId);

    INSERT INTO teams (id, name, tournament_id)
    VALUES (@team2Id, 'SNTE 53', @tournamentId);
    
    -- =========================================================
    -- 4. JUGADORES (Tacos El Zurdo)
    -- =========================================================
    INSERT INTO players (id, first_name, last_name, number, position, bats, throws, team_id) VALUES
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Esteban', 'Quiñónez L.', ABS(CHECKSUM(NEWID()) % 99) + 1, '9', 'R', 'R', @team1Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Cristian', 'Gamboa', ABS(CHECKSUM(NEWID()) % 99) + 1, '8', 'R', 'R', @team1Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'David', 'González Cruz', ABS(CHECKSUM(NEWID()) % 99) + 1, '4', 'R', 'R', @team1Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Flavio', 'Luque V.', ABS(CHECKSUM(NEWID()) % 99) + 1, '5', 'R', 'R', @team1Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Juan Pablo', 'Córdova S.', ABS(CHECKSUM(NEWID()) % 99) + 1, '3', 'R', 'R', @team1Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Paul', 'Gamboa M.', ABS(CHECKSUM(NEWID()) % 99) + 1, '6', 'R', 'R', @team1Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Jesús Pablo', 'Córdova', ABS(CHECKSUM(NEWID()) % 99) + 1, '2', 'R', 'R', @team1Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'José Luis', 'Patiño', ABS(CHECKSUM(NEWID()) % 99) + 1, '10', 'R', 'R', @team1Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Arturo', 'Valdez Chaparro', ABS(CHECKSUM(NEWID()) % 99) + 1, '7', 'R', 'R', @team1Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Julio César', 'Zamarripa', ABS(CHECKSUM(NEWID()) % 99) + 1, '1', 'R', 'R', @team1Id);

    -- =========================================================
    -- 5. JUGADORES (SNTE 53)
    -- =========================================================
    INSERT INTO players (id, first_name, last_name, number, position, bats, throws, team_id) VALUES
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Juan M.', 'Valenzuela', ABS(CHECKSUM(NEWID()) % 99) + 1, '7', 'R', 'R', @team2Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Heriberto', 'Pacheco', ABS(CHECKSUM(NEWID()) % 99) + 1, '5', 'R', 'R', @team2Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Luis', 'Mexía Félix', ABS(CHECKSUM(NEWID()) % 99) + 1, '6', 'R', 'R', @team2Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Manuel', 'Cota Rábago', ABS(CHECKSUM(NEWID()) % 99) + 1, '1', 'R', 'R', @team2Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Omar', 'Mayorquín E.', ABS(CHECKSUM(NEWID()) % 99) + 1, '2', 'R', 'R', @team2Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Jaime', 'Lugo Peñuelas', ABS(CHECKSUM(NEWID()) % 99) + 1, '9', 'R', 'R', @team2Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Manuel', 'Mexía Félix', ABS(CHECKSUM(NEWID()) % 99) + 1, '3', 'R', 'R', @team2Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Ramsés', 'Ruiz V.', ABS(CHECKSUM(NEWID()) % 99) + 1, '10', 'R', 'R', @team2Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'José de J.', 'Cuadras', ABS(CHECKSUM(NEWID()) % 99) + 1, '8', 'R', 'R', @team2Id),
    (LOWER(CONVERT(VARCHAR(36), NEWID())), 'Jesús', 'Zavala Arce', ABS(CHECKSUM(NEWID()) % 99) + 1, '4', 'R', 'R', @team2Id);
END
ELSE
BEGIN
    THROW 51000, 'Error: Usuario admin arturoval04@gmail.com no encontrado.', 1;
END

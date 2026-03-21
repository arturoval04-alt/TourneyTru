-- Script corregido para poblar la base de datos
-- Se corrigió el error de ON CONFLICT y se agregó el admin_id obligatorio para la liga

BEGIN;

-- 1. Insertar la Liga (si no existe)
-- Se requiere admin_id, usamos el del usuario arturoval04@gmail.com
INSERT INTO leagues (id, name, admin_id, created_at, updated_at)
SELECT uuid_generate_v4(), 'Liga Municipal de Softbol de Ahome', id, NOW(), NOW()
FROM users 
WHERE email = 'arturoval04@gmail.com'
AND NOT EXISTS (SELECT 1 FROM leagues WHERE name = 'Liga Municipal de Softbol de Ahome');

-- 2. Insertar el Torneo
-- Buscamos el ID de la liga y el ID del administrador
INSERT INTO tournaments (
    id, 
    name, 
    season, 
    rules_type, 
    category, 
    admin_id, 
    league_id, 
    location_city, 
    location_state, 
    description, 
    created_at
)
SELECT 
    uuid_generate_v4(),
    'Torneo Pollo Fierro LMSA',
    '2024',
    'softball_7',
    'Semirrápida Varonil',
    u.id,
    l.id,
    'Los Mochis',
    'Sinaloa',
    'Torneo Pollo Fierro en la Liga Municipal de Softbol de Ahome.',
    NOW()
FROM users u, leagues l
WHERE u.email = 'arturoval04@gmail.com' 
AND l.name = 'Liga Municipal de Softbol de Ahome'
AND NOT EXISTS (SELECT 1 FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA');

-- 3. Insertar Equipos
-- Tacos El Zurdo
INSERT INTO teams (id, name, tournament_id, created_at)
SELECT 
    uuid_generate_v4(), 
    'Tacos El Zurdo', 
    t.id, 
    NOW()
FROM tournaments t 
WHERE t.name = 'Torneo Pollo Fierro LMSA'
AND NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Tacos El Zurdo' AND tournament_id = t.id);

-- SNTE 53
INSERT INTO teams (id, name, tournament_id, created_at)
SELECT 
    uuid_generate_v4(), 
    'SNTE 53', 
    t.id, 
    NOW()
FROM tournaments t 
WHERE t.name = 'Torneo Pollo Fierro LMSA'
AND NOT EXISTS (SELECT 1 FROM teams WHERE name = 'SNTE 53' AND tournament_id = t.id);

-- 4. Insertar Jugadores de Tacos El Zurdo
-- Usamos una tabla temporal para facilitar la inserción de múltiples jugadores si es necesario, 
-- pero para este script seguiremos con inserciones directas con subconsultas seguras.

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Esteban', 'Quiñonez L.', 9, id, 'OF', NOW() FROM teams WHERE name = 'Tacos El Zurdo' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Cristian', 'Gamboa', 8, id, 'OF', NOW() FROM teams WHERE name = 'Tacos El Zurdo' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'David', 'González Cruz', 4, id, 'INF', NOW() FROM teams WHERE name = 'Tacos El Zurdo' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Flavio', 'Luque V.', 5, id, 'INF', NOW() FROM teams WHERE name = 'Tacos El Zurdo' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Juan Pablo', 'Córdova', 3, id, 'INF', NOW() FROM teams WHERE name = 'Tacos El Zurdo' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Paúl', 'Gamboa M.', 6, id, 'INF', NOW() FROM teams WHERE name = 'Tacos El Zurdo' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Jesús Pablo', 'Córdova', 2, id, 'C', NOW() FROM teams WHERE name = 'Tacos El Zurdo' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'José Luis', 'Patiño', 10, id, 'OF', NOW() FROM teams WHERE name = 'Tacos El Zurdo' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Arturo', 'Valdez Chaparro', 7, id, 'OF', NOW() FROM teams WHERE name = 'Tacos El Zurdo' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Julio César', 'Zamarripa', 1, id, 'P', NOW() FROM teams WHERE name = 'Tacos El Zurdo' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);


-- 5. Insertar Jugadores de SNTE 53
INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Juan M.', 'Valenzuela', 7, id, 'OF', NOW() FROM teams WHERE name = 'SNTE 53' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Heriberto', 'Pacheco', 5, id, 'INF', NOW() FROM teams WHERE name = 'SNTE 53' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Luis', 'Mexía Félix', 6, id, 'INF', NOW() FROM teams WHERE name = 'SNTE 53' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Manuel', 'Cota Rábago', 1, id, 'P', NOW() FROM teams WHERE name = 'SNTE 53' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Omar', 'Mayorquín E.', 2, id, 'C', NOW() FROM teams WHERE name = 'SNTE 53' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Jaime', 'Lugo Peñuelas', 9, id, 'OF', NOW() FROM teams WHERE name = 'SNTE 53' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Manuel', 'Mexía Félix', 3, id, 'INF', NOW() FROM teams WHERE name = 'SNTE 53' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Ramsés', 'Ruiz V.', 10, id, 'OF', NOW() FROM teams WHERE name = 'SNTE 53' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'José de J.', 'Cuadras', 8, id, 'OF', NOW() FROM teams WHERE name = 'SNTE 53' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

INSERT INTO players (id, first_name, last_name, number, team_id, position, created_at)
SELECT uuid_generate_v4(), 'Jesús', 'Zavala Arce', 4, id, 'INF', NOW() FROM teams WHERE name = 'SNTE 53' AND tournament_id = (SELECT id FROM tournaments WHERE name = 'Torneo Pollo Fierro LMSA' LIMIT 1);

COMMIT;

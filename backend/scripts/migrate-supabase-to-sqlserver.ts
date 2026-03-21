/**
 * migrate-supabase-to-sqlserver.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Migra todos los datos de Supabase (PostgreSQL) a SQL Server via Prisma.
 *
 * REQUISITOS antes de correr:
 *   1. schema.prisma ya apunta a sqlserver (provider = "sqlserver")
 *   2. Las tablas ya existen en SQL Server (npx prisma migrate deploy)
 *   3. Variables SUPABASE_DIRECT_URL y DATABASE_URL están en .env
 *
 * USO:
 *   npx ts-node -r tsconfig-paths/register scripts/migrate-supabase-to-sqlserver.ts
 *
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient } from '@prisma/client';
import { Client as PgClient } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// ── Clientes ──────────────────────────────────────────────────────────────────

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

const pg = new PgClient({
  connectionString: process.env.SUPABASE_DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDate(val: any): Date | null {
  if (!val) return null;
  return new Date(val);
}

function toDateRequired(val: any): Date {
  return new Date(val);
}

async function query<T = any>(sql: string): Promise<T[]> {
  const result = await pg.query(sql);
  return result.rows as T[];
}

function log(table: string, count: number) {
  console.log(`  ✔ ${table.padEnd(25)} ${count} registros migrados`);
}

// ── Limpieza previa (orden inverso a FK para no violar constraints) ───────────

async function cleanDatabase() {
  console.log('  🗑  Limpiando tablas existentes...');
  // Orden inverso al de inserción (hijos antes que padres)
  await prisma.$executeRaw`DELETE FROM [dbo].[plays]`;
  await prisma.$executeRaw`DELETE FROM [dbo].[lineup_changes]`;
  await prisma.$executeRaw`DELETE FROM [dbo].[lineups]`;
  await prisma.$executeRaw`DELETE FROM [dbo].[game_umpires]`;
  await prisma.$executeRaw`DELETE FROM [dbo].[player_stats]`;
  await prisma.$executeRaw`DELETE FROM [dbo].[tournament_news]`;
  await prisma.$executeRaw`DELETE FROM [dbo].[games]`;
  await prisma.$executeRaw`DELETE FROM [dbo].[umpires]`;
  await prisma.$executeRaw`DELETE FROM [dbo].[players]`;
  await prisma.$executeRaw`DELETE FROM [dbo].[teams]`;
  await prisma.$executeRaw`DELETE FROM [dbo].[fields]`;
  await prisma.$executeRaw`DELETE FROM [dbo].[tournament_organizers]`;
  await prisma.$executeRaw`DELETE FROM [dbo].[tournaments]`;
  await prisma.$executeRaw`DELETE FROM [dbo].[leagues]`;
  await prisma.$executeRaw`DELETE FROM [dbo].[users]`;
  await prisma.$executeRaw`DELETE FROM [dbo].[roles]`;
  console.log('  ✔ Tablas limpias\n');
}

// ── Migración por tabla (orden respeta FK) ────────────────────────────────────

async function migrateRoles() {
  const rows = await query('SELECT * FROM roles ORDER BY name');
  if (!rows.length) { log('roles', 0); return; }

  await prisma.role.createMany({
    data: rows.map(r => ({ id: r.id, name: r.name })),
    // skipDuplicates no soportado en SQL Server
  });
  log('roles', rows.length);
}

async function migrateUsers() {
  const rows = await query('SELECT * FROM users');
  if (!rows.length) { log('users', 0); return; }

  await prisma.user.createMany({
    data: rows.map(r => ({
      id:                  r.id,
      email:               r.email,
      passwordHash:        r.password_hash,
      firstName:           r.first_name,
      lastName:            r.last_name,
      phone:               r.phone ?? null,
      profilePicture:      r.profile_picture ?? null,
      roleId:              r.role_id,
      passwordResetToken:  r.password_reset_token ?? null,
      passwordResetExpiry: toDate(r.password_reset_expiry),
      createdAt:           toDateRequired(r.created_at),
      updatedAt:           toDateRequired(r.updated_at),
    })),
    // skipDuplicates no soportado en SQL Server
  });
  log('users', rows.length);
}

async function migrateLeagues() {
  const rows = await query('SELECT * FROM leagues');
  if (!rows.length) { log('leagues', 0); return; }

  await prisma.league.createMany({
    data: rows.map(r => ({
      id:        r.id,
      name:      r.name,
      logoUrl:   r.logo_url ?? null,
      adminId:   r.admin_id,
      createdAt: toDateRequired(r.created_at),
      updatedAt: toDateRequired(r.updated_at),
    })),
    // skipDuplicates no soportado en SQL Server
  });
  log('leagues', rows.length);
}

async function migrateTournaments() {
  const rows = await query('SELECT * FROM tournaments');
  if (!rows.length) { log('tournaments', 0); return; }

  await prisma.tournament.createMany({
    data: rows.map(r => ({
      id:            r.id,
      name:          r.name,
      season:        r.season,
      description:   r.description ?? null,
      category:      r.category ?? null,
      logoUrl:       r.logo_url ?? null,
      rulesType:     r.rules_type ?? 'baseball_9',
      adminId:       r.admin_id,
      leagueId:      r.league_id,
      locationCity:  r.location_city ?? null,
      locationState: r.location_state ?? null,
      createdAt:     toDateRequired(r.created_at),
    })),
    // skipDuplicates no soportado en SQL Server
  });
  log('tournaments', rows.length);
}

async function migrateTournamentOrganizers() {
  const rows = await query('SELECT * FROM tournament_organizers');
  if (!rows.length) { log('tournament_organizers', 0); return; }

  await prisma.tournamentOrganizer.createMany({
    data: rows.map(r => ({
      id:           r.id,
      tournamentId: r.tournament_id,
      userId:       r.user_id,
      createdAt:    toDateRequired(r.created_at),
    })),
    // skipDuplicates no soportado en SQL Server
  });
  log('tournament_organizers', rows.length);
}

async function migrateFields() {
  const rows = await query('SELECT * FROM fields');
  if (!rows.length) { log('fields', 0); return; }

  await prisma.field.createMany({
    data: rows.map(r => ({
      id:           r.id,
      name:         r.name,
      location:     r.location ?? null,
      tournamentId: r.tournament_id,
      createdAt:    toDateRequired(r.created_at),
    })),
    // skipDuplicates no soportado en SQL Server
  });
  log('fields', rows.length);
}

async function migrateTeams() {
  const rows = await query('SELECT * FROM teams');
  if (!rows.length) { log('teams', 0); return; }

  await prisma.team.createMany({
    data: rows.map(r => ({
      id:           r.id,
      name:         r.name,
      shortName:    r.short_name ?? null,
      logoUrl:      r.logo_url ?? null,
      managerName:  r.manager_name ?? null,
      tournamentId: r.tournament_id,
      homeFieldId:  r.home_field_id ?? null,
      createdAt:    toDateRequired(r.created_at),
    })),
    // skipDuplicates no soportado en SQL Server
  });
  log('teams', rows.length);
}

async function migratePlayers() {
  const rows = await query('SELECT * FROM players');
  if (!rows.length) { log('players', 0); return; }

  await prisma.player.createMany({
    data: rows.map(r => ({
      id:        r.id,
      firstName: r.first_name,
      lastName:  r.last_name,
      number:    r.number ?? null,
      position:  r.position ?? null,
      photoUrl:  r.photo_url ?? null,
      bats:      r.bats ?? 'R',
      throws:    r.throws ?? 'R',
      teamId:    r.team_id,
      createdAt: toDateRequired(r.created_at),
    })),
    // skipDuplicates no soportado en SQL Server
  });
  log('players', rows.length);
}

async function migrateUmpires() {
  const rows = await query('SELECT * FROM umpires');
  if (!rows.length) { log('umpires', 0); return; }

  await prisma.umpire.createMany({
    data: rows.map(r => ({
      id:        r.id,
      firstName: r.first_name,
      lastName:  r.last_name,
      leagueId:  r.league_id,
    })),
    // skipDuplicates no soportado en SQL Server
  });
  log('umpires', rows.length);
}

async function migrateGames() {
  const rows = await query('SELECT * FROM games');
  if (!rows.length) { log('games', 0); return; }

  await prisma.game.createMany({
    data: rows.map(r => ({
      id:               r.id,
      field:            r.field ?? null,
      scheduledDate:    toDateRequired(r.scheduled_date),
      startTime:        toDate(r.start_time),
      endTime:          toDate(r.end_time),
      status:           r.status ?? 'scheduled',
      homeScore:        r.home_score ?? 0,
      awayScore:        r.away_score ?? 0,
      currentInning:    r.current_inning ?? 1,
      half:             r.half ?? 'top',
      tournamentId:     r.tournament_id,
      homeTeamId:       r.home_team_id,
      awayTeamId:       r.away_team_id,
      winningPitcherId: r.winning_pitcher_id ?? null,
      mvpBatter1Id:     r.mvp_batter1_id ?? null,
      mvpBatter2Id:     r.mvp_batter2_id ?? null,
      createdAt:        toDateRequired(r.created_at),
    })),
    // skipDuplicates no soportado en SQL Server
  });
  log('games', rows.length);
}

async function migrateLineups() {
  const rows = await query('SELECT * FROM lineups');
  if (!rows.length) { log('lineups', 0); return; }

  await prisma.lineup.createMany({
    data: rows.map(r => ({
      id:            r.id,
      battingOrder:  r.batting_order,
      position:      r.position,
      dhForPosition: r.dh_for_position ?? null,
      isStarter:     r.is_starter ?? true,
      gameId:        r.game_id,
      teamId:        r.team_id,
      playerId:      r.player_id,
      createdAt:     toDateRequired(r.created_at),
    })),
    // skipDuplicates no soportado en SQL Server
  });
  log('lineups', rows.length);
}

async function migrateLineupChanges() {
  const rows = await query('SELECT * FROM lineup_changes');
  if (!rows.length) { log('lineup_changes', 0); return; }

  await prisma.lineupChange.createMany({
    data: rows.map(r => ({
      id:            r.id,
      battingOrder:  r.batting_order,
      position:      r.position,
      dhForPosition: r.dh_for_position ?? null,
      gameId:        r.game_id,
      teamId:        r.team_id,
      playerOutId:   r.player_out_id ?? null,
      playerInId:    r.player_in_id,
      createdAt:     toDateRequired(r.created_at),
    })),
    // skipDuplicates no soportado en SQL Server
  });
  log('lineup_changes', rows.length);
}

async function migratePlays() {
  const rows = await query('SELECT * FROM plays');
  if (!rows.length) { log('plays', 0); return; }

  // Plays puede ser grande, procesamos en batches de 500
  const BATCH = 500;
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await prisma.play.createMany({
      data: batch.map(r => ({
        id:            r.id,
        inning:        r.inning,
        half:          r.half,
        outsBeforePlay: r.outs_before_play,
        result:        r.result,
        rbi:           r.rbi ?? 0,
        runsScored:    r.runs_scored ?? 0,
        outsRecorded:  r.outs_recorded ?? 0,
        gameId:        r.game_id,
        batterId:      r.batter_id,
        pitcherId:     r.pitcher_id,
        timestamp:     toDateRequired(r.timestamp),
      })),
      // skipDuplicates no soportado en SQL Server (solo PostgreSQL)
    });
    total += batch.length;
  }
  log('plays', total);
}

async function migrateGameUmpires() {
  const rows = await query('SELECT * FROM game_umpires');
  if (!rows.length) { log('game_umpires', 0); return; }

  await prisma.gameUmpire.createMany({
    data: rows.map(r => ({
      id:        r.id,
      role:      r.role ?? 'plate',
      gameId:    r.game_id,
      umpireId:  r.umpire_id,
      createdAt: toDateRequired(r.created_at),
    })),
  });
  log('game_umpires', rows.length);
}

async function migratePlayerStats() {
  const rows = await query('SELECT * FROM player_stats');
  if (!rows.length) { log('player_stats', 0); return; }

  await prisma.playerStat.createMany({
    data: rows.map(r => ({
      id:           r.id,
      playerId:     r.player_id,
      teamId:       r.team_id,
      tournamentId: r.tournament_id ?? null,
      atBats:       r.at_bats   ?? 0,
      runs:         r.runs      ?? 0,
      hits:         r.hits      ?? 0,
      h2:           r.h2        ?? 0,
      h3:           r.h3        ?? 0,
      hr:           r.hr        ?? 0,
      rbi:          r.rbi       ?? 0,
      bb:           r.bb        ?? 0,
      so:           r.so        ?? 0,
      hbp:          r.hbp       ?? 0,
      sac:          r.sac       ?? 0,
      wins:         r.wins      ?? 0,
      losses:       r.losses    ?? 0,
      ipOuts:       r.ip_outs   ?? 0,
      hAllowed:     r.h_allowed  ?? 0,
      erAllowed:    r.er_allowed ?? 0,
      bbAllowed:    r.bb_allowed ?? 0,
      soPitching:   r.so_pitching ?? 0,
      createdAt:    toDateRequired(r.created_at),
      updatedAt:    toDateRequired(r.updated_at),
    })),
  });
  log('player_stats', rows.length);
}

async function migrateTournamentNews() {
  const rows = await query('SELECT * FROM tournament_news');
  if (!rows.length) { log('tournament_news', 0); return; }

  await prisma.tournamentNews.createMany({
    data: rows.map(r => ({
      id:           r.id,
      tournamentId: r.tournament_id,
      authorId:     r.author_id ?? null,
      title:        r.title,
      description:  r.description ?? null,
      coverUrl:     r.cover_url ?? null,
      facebookUrl:  r.facebook_url ?? null,
      type:         r.type ?? 'Noticia',
      hasVideo:     r.has_video ?? false,
      createdAt:    toDateRequired(r.created_at),
    })),
  });
  log('tournament_news', rows.length);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 Iniciando migración Supabase → SQL Server\n');
  console.log('━'.repeat(50));

  await pg.connect();
  console.log('✔ Conectado a Supabase (PostgreSQL)');
  console.log('✔ Conectado a SQL Server via Prisma');
  console.log('━'.repeat(50));

  // Limpia todo primero para evitar duplicados
  await cleanDatabase();

  // Orden estricto por dependencias FK
  await migrateRoles();
  await migrateUsers();
  await migrateLeagues();
  await migrateTournaments();
  await migrateTournamentOrganizers();
  await migrateFields();
  await migrateTeams();
  await migratePlayers();
  await migrateUmpires();
  await migrateGames();
  await migrateGameUmpires();
  await migratePlayerStats();
  await migrateTournamentNews();
  await migrateLineups();
  await migrateLineupChanges();
  await migratePlays();

  console.log('━'.repeat(50));
  console.log('\n✅ Migración completada exitosamente\n');
  console.log('⚠  Recuerda borrar SUPABASE_DIRECT_URL del .env cuando termines\n');
}

main()
  .catch(e => {
    console.error('\n❌ Error durante la migración:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await pg.end();
    await prisma.$disconnect();
  });

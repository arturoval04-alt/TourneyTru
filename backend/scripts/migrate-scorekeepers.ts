import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Scorekeeper Tournament Migration ---');
  
  // 1. Find all users who have a league assigned (likely scorekeepers)
  const scorekeepers = await prisma.user.findMany({
    where: {
      scorekeeperLeagueId: { not: null },
    },
    include: {
      role: true,
    }
  });

  console.log(`Found ${scorekeepers.length} scorekeepers with league IDs.`);

  for (const sk of scorekeepers) {
    if (!sk.scorekeeperLeagueId) continue;

    // 2. Find all tournaments in that league
    const tournaments = await prisma.tournament.findMany({
      where: { leagueId: sk.scorekeeperLeagueId },
      select: { id: true, name: true }
    });

    console.log(`User ${sk.email} (League: ${sk.scorekeeperLeagueId}) -> ${tournaments.length} tournaments found.`);

    for (const t of tournaments) {
      // 3. Create link if it doesn't exist
      try {
        await prisma.scorekeeperTournament.upsert({
          where: {
            userId_tournamentId: {
              userId: sk.id,
              tournamentId: t.id,
            }
          },
          update: {},
          create: {
            userId: sk.id,
            tournamentId: t.id,
          }
        });
        console.log(`  - Linked to tournament: ${t.name}`);
      } catch (err) {
        console.error(`  - Failed to link ${sk.email} to ${t.name}:`, err.message);
      }
    }
  }

  console.log('--- Migration Completed ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.play.deleteMany({});
    await prisma.lineup.deleteMany({});
    await prisma.game.deleteMany({});
    console.log("All games, lineups, and plays have been wiped successfully for a fresh test.");
}
main().catch(console.error).finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    try {
        const users = await prisma.user.findMany({ include: { role: true } });
        for (const u of users) {
             try {
                 await prisma.$transaction(async (tx) => {
                     await tx.tournamentOrganizer.deleteMany({ where: { userId: u.id } });
                     await tx.tournamentNews.updateMany({ where: { authorId: u.id }, data: { authorId: null } });
                     await tx.user.delete({ where: { id: u.id } });
                     throw new Error("ROLLBACK");
                 });
             } catch (e: any) {
                 if (e.message !== "ROLLBACK") {
                     console.log(`Failed for ${u.email}: code=${e.code}, meta=${JSON.stringify(e.meta)}`);
                 } else {
                     console.log(`Success for ${u.email}`);
                 }
             }
        }
    } finally {
        await prisma.$disconnect();
    }
}
run();

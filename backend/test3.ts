import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function run() {
    const logs: string[] = [];
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
                     logs.push(`Failed for ${u.email} (${u.role.name}): code=${e.code}, meta=${JSON.stringify(e.meta)}`);
                 } else {
                     logs.push(`Success for ${u.email} (${u.role.name})`);
                 }
             }
        }
    } finally {
        await prisma.$disconnect();
        fs.writeFileSync('test3.log', logs.join('\n'), 'utf-8');
    }
}
run();

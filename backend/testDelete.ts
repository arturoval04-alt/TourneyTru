import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    try {
        // Find a user that is likely throwing the error,
        // for example an organizer or a scorekeeper
        const users = await prisma.user.findMany({
            include: { role: true }
        });

        console.log(`Testing deletion on non-admin users...`);
        let failedCount = 0;
        for (const u of users) {
            if (u.role.name === 'admin' || u.role.name === 'presi' || u.role.name === 'organizer' || u.role.name === 'scorekeeper') {
                // To avoid deleting actually good users, let's do a dry run or just catch it.
                // Wait, if it fails, we want to see the error. We can use a transaction and rollback.
                try {
                    await prisma.$transaction(async (tx) => {
                        console.log(`Deleting ${u.email} (${u.role.name})...`);
                        
                        // Delete TO
                        await tx.tournamentOrganizer.deleteMany({ where: { userId: u.id }});
                        
                        // Update news
                        await tx.tournamentNews.updateMany({ where: { authorId: u.id }, data: { authorId: null }});

                        // Delete
                        await tx.user.delete({ where: { id: u.id }});

                        throw new Error("ROLLBACK_TO_PREVENT_REAL_DELETE");
                    });
                } catch(e: any) {
                    if (e.message !== "ROLLBACK_TO_PREVENT_REAL_DELETE") {
                        console.error(`=> FAILED for ${u.email}:`, e.message);
                        failedCount++;
                    } else {
                        console.log(`=> Delete would SUCCEED for ${u.email}`);
                    }
                }
            }
        }
        console.log("Failed deletions:", failedCount);
    } catch(e: any) {
        console.error("Critical Failure:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
run();

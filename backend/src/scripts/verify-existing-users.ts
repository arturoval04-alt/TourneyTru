/**
 * Script one-time: marca como verificados todos los usuarios
 * creados antes de que se implementara la verificación por correo.
 *
 * Ejecutar con:
 *   npx ts-node -r tsconfig-paths/register src/scripts/verify-existing-users.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const result = await prisma.user.updateMany({
        where: {
            OR: [
                { emailVerified: false },
                { emailVerified: null as any },
            ],
        },
        data: { emailVerified: true },
    });

    console.log(`✅ ${result.count} usuarios marcados como verificados.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

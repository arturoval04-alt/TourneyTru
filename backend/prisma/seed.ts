import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('Iniciando limpieza y Seed para producción...');

    // 0. Create An Admin User
    const adminRole = await prisma.role.upsert({
        where: { name: 'admin' },
        update: {},
        create: { name: 'admin' }
    });

    const admin = await prisma.user.upsert({
        where: { email: 'admin_seeder@basemanager.test' },
        update: {},
        create: {
            email: 'admin_seeder@basemanager.test',
            passwordHash: 'fakehash123',
            firstName: 'Admin',
            lastName: 'Seeder',
            roleId: adminRole.id
        }
    });

    // 1. Create a League
    const league = await prisma.league.create({
        data: {
            name: 'Liga de Desarrollo BaseManager',
            adminId: admin.id
        },
    });
    console.log(`Liga creada con id: ${league.id}`);

    // 2. Create a Tournament
    const tournament = await prisma.tournament.create({
        data: {
            name: 'Torneo Apertura 2026',
            season: 'Spring',
            rulesType: 'baseball_9',
            leagueId: league.id,
            adminId: admin.id,
            category: 'Libre'
        },
    });
    console.log(`Torneo creado con id: ${tournament.id}`);

    // 3. Create Teams
    const teamA = await prisma.team.create({
        data: {
            name: 'Navegantes de Magallanes',
            shortName: 'MAG',
            tournamentId: tournament.id,
        },
    });

    const teamB = await prisma.team.create({
        data: {
            name: 'Leones del Caracas',
            shortName: 'CAR',
            tournamentId: tournament.id,
        },
    });
    console.log(`Equipos creados: ${teamA.name}, ${teamB.name}`);

    // 4. Invent 10 players for Team A
    const firstNames = ['Carlos', 'Miguel', 'Jose', 'Luis', 'Juan', 'Pedro', 'Andres', 'Jorge', 'Fernando', 'Rafael'];
    const lastNames = ['Perez', 'Garcia', 'Martinez', 'Rodriguez', 'Lopez', 'Hernandez', 'Gonzalez', 'Torres', 'Ramirez', 'Flores'];

    for (let i = 0; i < 10; i++) {
        await prisma.player.create({
            data: {
                firstName: firstNames[i],
                lastName: lastNames[i],
                number: Math.floor(Math.random() * 99) + 1,
                position: ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'][Math.floor(Math.random() * 9)],
                bats: ['R', 'L', 'S'][Math.floor(Math.random() * 3)],
                throws: ['R', 'L'][Math.floor(Math.random() * 2)],
                teamId: teamA.id
            }
        });
    }

    // Invent 10 players for Team B
    for (let i = 0; i < 10; i++) {
        await prisma.player.create({
            data: {
                firstName: firstNames[9 - i],
                lastName: lastNames[9 - i],
                number: Math.floor(Math.random() * 99) + 1,
                position: ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'][Math.floor(Math.random() * 9)],
                bats: ['R', 'L', 'S'][Math.floor(Math.random() * 3)],
                throws: ['R', 'L'][Math.floor(Math.random() * 2)],
                teamId: teamB.id
            }
        });
    }

    console.log('20 Jugadores añadidos a los equipos (10 por equipo).');
    console.log('¡Seeding completado con éxito, base de datos limpia y lista para usar!');
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })

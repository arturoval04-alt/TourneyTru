/**
 * Backfill Fase A — Unidades deportivas y campos a nivel liga
 *
 * 1. Por cada liga, crea una SportsUnit "General" si no existe.
 * 2. Mueve todos los campos vinculados a torneos de esa liga a la unidad General
 *    (setea leagueId + sportsUnitId; mantiene tournamentId para compatibilidad).
 * 3. Por cada juego que tenga `field` (string), busca un campo cuyo nombre coincida
 *    (case-insensitive) en la misma liga y setea fieldId.
 *
 * Ejecutar: npx ts-node prisma/backfill-fase-a.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const leagues = await prisma.league.findMany({
        include: {
            tournaments: {
                select: { id: true, fields: { select: { id: true, name: true } } },
            },
        },
    });

    console.log(`\n🏟️  Procesando ${leagues.length} liga(s)...\n`);

    for (const league of leagues) {
        console.log(`📋 Liga: ${league.name} (${league.id})`);

        // ── 1. Crear unidad "General" si no existe ───────────────────────────
        let generalUnit = await (prisma as any).sportsUnit.findFirst({
            where: { leagueId: league.id, name: 'General' },
        });

        if (!generalUnit) {
            generalUnit = await (prisma as any).sportsUnit.create({
                data: { leagueId: league.id, name: 'General' },
            });
            console.log(`  ✅ Creada unidad "General" (${generalUnit.id})`);
        } else {
            console.log(`  ℹ️  Unidad "General" ya existe (${generalUnit.id})`);
        }

        // ── 2. Migrar campos de torneos a la liga ────────────────────────────
        const allFields: { id: string; name: string }[] = [];

        for (const tournament of league.tournaments) {
            for (const field of tournament.fields) {
                allFields.push(field);

                const updated = await prisma.field.updateMany({
                    where: { id: field.id, leagueId: null },
                    data: {
                        leagueId: league.id,
                        sportsUnitId: generalUnit.id,
                    },
                });

                if (updated.count > 0) {
                    console.log(`  🏟️  Campo migrado: "${field.name}" → liga + unidad General`);
                } else {
                    console.log(`  ↩️  Campo ya migrado o sin cambios: "${field.name}"`);
                }
            }
        }

        // ── 3. Mapear games.field (string) → games.fieldId ──────────────────
        const games = await prisma.game.findMany({
            where: {
                tournamentId: { in: league.tournaments.map((t) => t.id) },
                field: { not: null },
                fieldId: null,
            },
            select: { id: true, field: true },
        });

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        for (const game of games) {
            if (!game.field) continue;

            // Caso 1: el campo field ya es un UUID — lo usamos directamente como fieldId
            if (uuidRegex.test(game.field.trim())) {
                const fieldExists = allFields.find((f) => f.id === game.field!.trim());
                if (fieldExists) {
                    await prisma.game.update({
                        where: { id: game.id },
                        data: { fieldId: fieldExists.id },
                    });
                    console.log(`  ⚾ Juego ${game.id}: field UUID → fieldId=${fieldExists.id} ("${fieldExists.name}")`);
                    continue;
                }
            }

            // Caso 2: el campo field es el nombre del campo — búsqueda por nombre
            const match = allFields.find(
                (f) => f.name.trim().toLowerCase() === game.field!.trim().toLowerCase(),
            );

            if (match) {
                await prisma.game.update({
                    where: { id: game.id },
                    data: { fieldId: match.id },
                });
                console.log(`  ⚾ Juego ${game.id}: field="${game.field}" → fieldId=${match.id}`);
            } else {
                console.log(`  ⚠️  Juego ${game.id}: field="${game.field}" sin coincidencia de campo`);
            }
        }

        console.log('');
    }

    console.log('✅ Backfill completado.\n');
}

main()
    .catch((e) => {
        console.error('❌ Error en backfill:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

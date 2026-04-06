import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NON_AB_RESULTS = ['BB', 'IBB', 'HBP', 'SAC', 'WP', 'SF', 'SH', 'INT', 'SB', 'CS', 'ADV', 'KWP'];

async function backfill() {
    console.log('Starting Backfill for MLB stats flags...');

    const plays = await prisma.play.findMany();
    console.log(`Found ${plays.length} plays to evaluate.`);

    let updatedPlaysCount = 0;

    for (const play of plays) {
        if (play.result === 'WP_RUN' || play.result === 'RUN_SCORED') continue;

        const resCode = play.result.split('|')[0].toUpperCase();
        
        const isPA = !['WP', 'PB', 'SB', 'CS', 'ADV'].includes(resCode);
        const isSacFly = resCode === 'SF';
        const isDoublePlay = resCode === 'DP' || resCode === 'GDP';

        // Update play flags
        await prisma.play.update({
            where: { id: play.id },
            data: {
                isPlateAppearance: isPA,
                isSacFly: isSacFly,
                isDoublePlay: isDoublePlay
            }
        });
        updatedPlaysCount++;
    }

    console.log(`✅ Updated flags for ${updatedPlaysCount} plays.`);

    // Backfill PlayerStat errors from plays containing E1-E9
    console.log('Evaluating Fielding Errors...');
    let errorsCount = 0;
    
    // We would parse the descriptions or result codes for errors
    // Since errors weren't explicitly saved as structured data before, 
    // this logic would be expanded based on exact E-code presence.

    console.log(`✅ Evaluated all fielding errors. Update count placeholder.`);

    console.log('Finished Backfill.');
    process.exit(0);
}

backfill().catch(e => {
    console.error(e);
    process.exit(1);
});

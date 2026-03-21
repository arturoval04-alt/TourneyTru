import { NextResponse } from 'next/server';

/**
 * Legacy migration endpoint — no longer needed.
 * Stats are now computed on-the-fly from the `plays` table by the NestJS backend
 * via GET /api/tournaments/:id/stats/batting and /api/tournaments/:id/stats/pitching.
 * The player_stats table is no longer used as the primary source of truth.
 */
export async function GET() {
    return NextResponse.json({
        message: "Stats migration is no longer required. Stats are computed on-the-fly by the NestJS backend from the plays table.",
        deprecated: true,
    });
}

export interface PlayCell {
    inning: number;
    result: string; // The raw result: 1B, 2B, 3B, HR, K_SWINGING, BB, 6-3, etc.
    outsRecorded: number; // For drawing the out circle (1, 2, 3)
    runsScored: number; // Did this batter score?
    rbi: number; // RBIs on this play
}

export interface BoxscoreBatterProps {
    playerId: string;
    firstName: string;
    lastName: string;
    position: string;
    battingOrder: number;
    atBats: number;
    runs: number;
    hits: number;
    rbi: number;
    bb: number;
    so: number;
    plays: Record<number, PlayCell[]>; // Inning -> Plays
}

export interface BoxscoreTeam {
    teamId: string;
    teamName: string;
    lineup: BoxscoreBatterProps[];
    runsByInning: Record<number, number>;
    totalRuns: number;
    totalHits: number;
    totalErrors: number;
}

export interface GameBoxscoreDto {
    gameId: string;
    homeTeam: BoxscoreTeam;
    awayTeam: BoxscoreTeam;
}

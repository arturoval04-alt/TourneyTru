export interface PlayCell {
    inning: number;
    result: string;
    outsRecorded: number;
    outsBeforePlay?: number;
    runsScored: number;
    rbi: number;
    scored?: boolean;
}

export interface BoxscoreBatterProps {
    playerId: string;
    firstName: string;
    lastName: string;
    position: string;
    battingOrder: number;
    isStarter?: boolean;
    isFlex?: boolean;
    entryInning?: number;
    atBats: number;
    runs: number;
    hits: number;
    rbi: number;
    bb: number;
    so: number;
    pitchingHits?: number;
    pitchingRuns?: number;
    pitchingBB?: number;
    pitchingSO?: number;
    pitchingIPOuts?: number;
    plays: Record<number, PlayCell[]>;
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
    status: string;
    homeTeam: BoxscoreTeam;
    awayTeam: BoxscoreTeam;
    winningPitcher?: any;
    mvpBatter1?: any;
    mvpBatter2?: any;
}

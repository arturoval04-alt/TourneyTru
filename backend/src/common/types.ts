export interface Requestor {
  id?: string;
  userId?: string;
  role?: string;
  scorekeeperLeagueId?: string | null;
  scorekeeperTournamentIds?: string[];
  delegateTeamId?: string | null;
  delegateTournamentId?: string | null;
  delegateTeamIds?: string[];
  delegateTournamentIds?: string[];
  delegateAssignments?: Array<{
    id?: string;
    teamId: string;
    tournamentId: string;
  }>;
  isDelegateActive?: boolean | null;
}

export interface Requestor {
  id?: string;
  userId?: string;
  role?: string;
  scorekeeperLeagueId?: string | null;
  scorekeeperTournamentIds?: string[];
  delegateTeamId?: string | null;
  delegateTournamentId?: string | null;
  isDelegateActive?: boolean | null;
}

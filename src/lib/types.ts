export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  number: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  players: Player[];
}

export interface Match {
  id: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  date: string;
  time: string;
  location: string;
  stage: "group" | "semi-final" | "final";
  group?: string;
  matchday?: number;
  played: boolean;
}

export interface Group {
  name: string;
  teamIds: string[];
}

export interface Standing {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export type TournamentStatus = "upcoming" | "in_progress" | "completed";

export interface Tournament {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  numberOfGroups: number;
  teamsPerGroup: number;
  status: TournamentStatus;
  teams: Team[];
  groups: Group[];
  matches: Match[];
}

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Tournament, Match, Team, Player } from "./types";
import { initialTournaments } from "./data";

interface TournamentContextType {
  tournaments: Tournament[];
  addTournament: (t: Tournament) => void;
  updateTournament: (id: string, updates: Partial<Tournament>) => void;
  deleteTournament: (id: string) => void;
  updateMatch: (tournamentId: string, match: Match) => void;
  addTeam: (tournamentId: string, team: Team) => void;
  addPlayerToTeam: (
    tournamentId: string,
    teamId: string,
    player: Player
  ) => void;
  addMatches: (tournamentId: string, matches: Match[]) => void;
}

const TournamentContext = createContext<TournamentContextType | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [tournaments, setTournaments] =
    useState<Tournament[]>(initialTournaments);

  const addTournament = useCallback((t: Tournament) => {
    setTournaments((prev) => [...prev, t]);
  }, []);

  const updateTournament = useCallback(
    (id: string, updates: Partial<Tournament>) => {
      setTournaments((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
    },
    []
  );

  const deleteTournament = useCallback((id: string) => {
    setTournaments((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateMatch = useCallback((tournamentId: string, match: Match) => {
    setTournaments((prev) =>
      prev.map((t) => {
        if (t.id !== tournamentId) return t;
        return {
          ...t,
          matches: t.matches.map((m) => (m.id === match.id ? match : m)),
        };
      })
    );
  }, []);

  const addTeam = useCallback((tournamentId: string, team: Team) => {
    setTournaments((prev) =>
      prev.map((t) => {
        if (t.id !== tournamentId) return t;
        return { ...t, teams: [...t.teams, team] };
      })
    );
  }, []);

  const addPlayerToTeam = useCallback(
    (tournamentId: string, teamId: string, player: Player) => {
      setTournaments((prev) =>
        prev.map((t) => {
          if (t.id !== tournamentId) return t;
          return {
            ...t,
            teams: t.teams.map((team) => {
              if (team.id !== teamId) return team;
              return { ...team, players: [...team.players, player] };
            }),
          };
        })
      );
    },
    []
  );

  const addMatches = useCallback(
    (tournamentId: string, matches: Match[]) => {
      setTournaments((prev) =>
        prev.map((t) => {
          if (t.id !== tournamentId) return t;
          return { ...t, matches: [...t.matches, ...matches] };
        })
      );
    },
    []
  );

  return (
    <TournamentContext.Provider
      value={{
        tournaments,
        addTournament,
        updateTournament,
        deleteTournament,
        updateMatch,
        addTeam,
        addPlayerToTeam,
        addMatches,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournaments() {
  const ctx = useContext(TournamentContext);
  if (!ctx)
    throw new Error("useTournaments must be used within TournamentProvider");
  return ctx;
}

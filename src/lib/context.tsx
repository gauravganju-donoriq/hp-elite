"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  Tournament,
  Match,
  Team,
  Player,
  PlayerAvailability,
  TimeSlot,
} from "./types";
import { initialTournaments, initialAvailability } from "./data";

interface TournamentContextType {
  tournaments: Tournament[];
  availability: PlayerAvailability[];
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
  setPlayerAvailability: (
    playerId: string,
    teamId: string,
    tournamentId: string,
    slots: TimeSlot[]
  ) => void;
  getTeamAvailabilityForDate: (
    teamId: string,
    tournamentId: string,
    date: string
  ) => { available: number; total: number; playerIds: string[] };
}

const TournamentContext = createContext<TournamentContextType | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [tournaments, setTournaments] =
    useState<Tournament[]>(initialTournaments);
  const [availability, setAvailability] =
    useState<PlayerAvailability[]>(initialAvailability);

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

  const setPlayerAvailability = useCallback(
    (
      playerId: string,
      teamId: string,
      tournamentId: string,
      slots: TimeSlot[]
    ) => {
      setAvailability((prev) => {
        const idx = prev.findIndex(
          (a) => a.playerId === playerId && a.tournamentId === tournamentId
        );
        const entry: PlayerAvailability = {
          playerId,
          teamId,
          tournamentId,
          slots,
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = entry;
          return next;
        }
        return [...prev, entry];
      });
    },
    []
  );

  const getTeamAvailabilityForDate = useCallback(
    (teamId: string, tournamentId: string, date: string) => {
      const tournament = tournaments.find((t) => t.id === tournamentId);
      const team = tournament?.teams.find((t) => t.id === teamId);
      const total = team?.players.length ?? 0;

      const teamAvail = availability.filter(
        (a) => a.teamId === teamId && a.tournamentId === tournamentId
      );
      const playerIds: string[] = [];
      for (const pa of teamAvail) {
        if (pa.slots.some((s) => s.date === date)) {
          playerIds.push(pa.playerId);
        }
      }
      return { available: playerIds.length, total, playerIds };
    },
    [tournaments, availability]
  );

  return (
    <TournamentContext.Provider
      value={{
        tournaments,
        availability,
        addTournament,
        updateTournament,
        deleteTournament,
        updateMatch,
        addTeam,
        addPlayerToTeam,
        addMatches,
        setPlayerAvailability,
        getTeamAvailabilityForDate,
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

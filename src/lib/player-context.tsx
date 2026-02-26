"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

interface PlayerIdentity {
  tournamentId: string;
  teamId: string;
  playerId: string;
}

interface PlayerContextType {
  identity: PlayerIdentity | null;
  setIdentity: (identity: PlayerIdentity) => void;
  clearIdentity: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

const STORAGE_KEY = "tournament-player-identity";

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentityState] = useState<PlayerIdentity | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setIdentityState(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const setIdentity = useCallback((id: PlayerIdentity) => {
    setIdentityState(id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(id));
    } catch {
      // ignore
    }
  }, []);

  const clearIdentity = useCallback(() => {
    setIdentityState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <PlayerContext.Provider value={{ identity, setIdentity, clearIdentity }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx)
    throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

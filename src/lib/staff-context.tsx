"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

interface StaffIdentity {
  staffId: string;
}

interface StaffIdentityContextType {
  identity: StaffIdentity | null;
  setIdentity: (identity: StaffIdentity) => void;
  clearIdentity: () => void;
}

const StaffIdentityContext = createContext<StaffIdentityContextType | null>(null);

const STORAGE_KEY = "hp-elite-staff-identity";

export function StaffIdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentityState] = useState<StaffIdentity | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setIdentityState(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const setIdentity = useCallback((id: StaffIdentity) => {
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
    <StaffIdentityContext.Provider value={{ identity, setIdentity, clearIdentity }}>
      {children}
    </StaffIdentityContext.Provider>
  );
}

export function useStaffIdentity() {
  const ctx = useContext(StaffIdentityContext);
  if (!ctx)
    throw new Error("useStaffIdentity must be used within StaffIdentityProvider");
  return ctx;
}

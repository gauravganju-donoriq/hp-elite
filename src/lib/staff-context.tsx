"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { authClient } from "./auth-client";
import type { Staff } from "./types";

interface StaffIdentityContextType {
  identity: { staffId: string } | null;
  staffRecord: Staff | null;
  isAdmin: boolean;
  userName: string | null;
  userEmail: string | null;
  loading: boolean;
  clearIdentity: () => void;
}

const StaffIdentityContext = createContext<StaffIdentityContextType | null>(null);

function useStaffFromApi(userId: string | undefined) {
  const [staffRecord, setStaffRecord] = useState<Staff | null>(null);
  const [fetched, setFetched] = useState(false);
  const [fetchedFor, setFetchedFor] = useState<string | undefined>(undefined);

  if (userId && userId !== fetchedFor) {
    setFetchedFor(userId);
    setFetched(false);
    fetch("/api/staff/me")
      .then((res) => res.json())
      .then((data) => {
        setStaffRecord(data);
        setFetched(true);
      })
      .catch(() => {
        setStaffRecord(null);
        setFetched(true);
      });
  } else if (!userId && fetchedFor) {
    setFetchedFor(undefined);
    setStaffRecord(null);
    setFetched(true);
  }

  return { staffRecord, loading: userId ? !fetched : false };
}

export function StaffIdentityProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  const userId = session?.user?.id;
  const { staffRecord, loading: staffLoading } = useStaffFromApi(userId);

  const clearIdentity = useCallback(() => {
    authClient.signOut();
  }, []);

  const isAdmin = session?.user?.role === "admin";
  const userName = session?.user?.name ?? null;
  const userEmail = session?.user?.email ?? null;
  const loading = isPending || staffLoading;

  const value = useMemo(
    () => ({
      identity: staffRecord ? { staffId: staffRecord.id } : null,
      staffRecord,
      isAdmin,
      userName,
      userEmail,
      loading,
      clearIdentity,
    }),
    [staffRecord, isAdmin, userName, userEmail, loading, clearIdentity]
  );

  return (
    <StaffIdentityContext.Provider value={value}>
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

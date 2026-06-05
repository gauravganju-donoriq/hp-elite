"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { authClient } from "./auth-client";
import type { Staff } from "./types";

interface StaffIdentityContextType {
  identity: { staffId: string } | null;
  staffRecord: Staff | null;
  isAdmin: boolean;
  /** True when the auth user is logged in but has no linked staff record. */
  unlinked: boolean;
  userName: string | null;
  userEmail: string | null;
  loading: boolean;
  clearIdentity: () => void;
}

const StaffIdentityContext = createContext<StaffIdentityContextType | null>(null);

function useStaffFromApi(userId: string | undefined): {
  staffRecord: Staff | null;
  loading: boolean;
  fetched: boolean;
} {
  const [staffRecord, setStaffRecord] = useState<Staff | null>(null);
  const [fetched, setFetched] = useState(false);
  const [loading, setLoading] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId) {
      setStaffRecord(null);
      setFetched(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setFetched(false);

    fetch("/api/staff/me", { signal: controller.signal })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setStaffRecord(null);
        } else {
          const data = await res.json();
          setStaffRecord(data ?? null);
        }
        setFetched(true);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled || err?.name === "AbortError") return;
        setStaffRecord(null);
        setFetched(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [userId]);

  return { staffRecord, loading, fetched };
}

export function StaffIdentityProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  const userId = session?.user?.id;
  const { staffRecord, loading: staffLoading, fetched } = useStaffFromApi(userId);

  const clearIdentity = useCallback(() => {
    authClient.signOut();
  }, []);

  const isAdmin = session?.user?.role === "admin";
  const userName = session?.user?.name ?? null;
  const userEmail = session?.user?.email ?? null;
  const loading = isPending || staffLoading;
  const unlinked = Boolean(userId) && fetched && !staffRecord && !isAdmin;

  const value = useMemo<StaffIdentityContextType>(
    () => ({
      identity: staffRecord ? { staffId: staffRecord.id } : null,
      staffRecord,
      isAdmin,
      unlinked,
      userName,
      userEmail,
      loading,
      clearIdentity,
    }),
    [staffRecord, isAdmin, unlinked, userName, userEmail, loading, clearIdentity]
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

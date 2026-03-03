"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type {
  Staff,
  Schedule,
  Session,
  Availability,
  AvailabilityStatus,
  StaffRole,
} from "./types";
import { initialStaff, initialSchedules, initialAvailability } from "./data";

interface SchedulingContextType {
  staff: Staff[];
  schedules: Schedule[];
  availability: Availability[];

  addStaff: (s: Staff) => void;
  updateStaff: (id: string, updates: Partial<Staff>) => void;
  removeStaff: (id: string) => void;

  addSchedule: (s: Schedule) => void;
  updateSchedule: (id: string, updates: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;

  addSession: (scheduleId: string, session: Session) => void;
  addSessions: (scheduleId: string, sessions: Session[]) => void;
  updateSession: (scheduleId: string, sessionId: string, updates: Partial<Session>) => void;
  removeSession: (scheduleId: string, sessionId: string) => void;

  setAvailability: (
    staffId: string,
    sessionId: string,
    status: AvailabilityStatus,
    customStartTime?: string,
    customEndTime?: string,
    notes?: string
  ) => void;
  removeAvailability: (staffId: string, sessionId: string) => void;
  getAvailability: (staffId: string, sessionId: string) => Availability | undefined;
  getSessionStaffCount: (sessionId: string) => { confirmed: number; maybe: number; total: number };
}

const STORAGE_KEY = "hp-elite-scheduling";

const SchedulingContext = createContext<SchedulingContextType | null>(null);

function loadFromStorage(): {
  staff: Staff[];
  schedules: Schedule[];
  availability: Availability[];
} | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return null;
}

function saveToStorage(data: {
  staff: Staff[];
  schedules: Schedule[];
  availability: Availability[];
}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function SchedulingProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [availability, setAvailability] = useState<Availability[]>(initialAvailability);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setStaff(stored.staff);
      setSchedules(stored.schedules);
      setAvailability(stored.availability);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      saveToStorage({ staff, schedules, availability });
    }
  }, [staff, schedules, availability, loaded]);

  const addStaff = useCallback((s: Staff) => {
    setStaff((prev) => [...prev, s]);
  }, []);

  const updateStaff = useCallback((id: string, updates: Partial<Staff>) => {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const removeStaff = useCallback((id: string) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
    setAvailability((prev) => prev.filter((a) => a.staffId !== id));
  }, []);

  const addSchedule = useCallback((s: Schedule) => {
    setSchedules((prev) => [...prev, s]);
  }, []);

  const updateSchedule = useCallback((id: string, updates: Partial<Schedule>) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const deleteSchedule = useCallback((id: string) => {
    setSchedules((prev) => {
      const schedule = prev.find((s) => s.id === id);
      if (schedule) {
        const sessionIds = new Set(schedule.sessions.map((s) => s.id));
        setAvailability((a) => a.filter((av) => !sessionIds.has(av.sessionId)));
      }
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const addSession = useCallback((scheduleId: string, session: Session) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== scheduleId) return s;
        return { ...s, sessions: [...s.sessions, session] };
      })
    );
  }, []);

  const addSessions = useCallback((scheduleId: string, sessions: Session[]) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== scheduleId) return s;
        return { ...s, sessions: [...s.sessions, ...sessions] };
      })
    );
  }, []);

  const updateSession = useCallback(
    (scheduleId: string, sessionId: string, updates: Partial<Session>) => {
      setSchedules((prev) =>
        prev.map((s) => {
          if (s.id !== scheduleId) return s;
          return {
            ...s,
            sessions: s.sessions.map((sess) =>
              sess.id === sessionId ? { ...sess, ...updates } : sess
            ),
          };
        })
      );
    },
    []
  );

  const removeSession = useCallback((scheduleId: string, sessionId: string) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== scheduleId) return s;
        return { ...s, sessions: s.sessions.filter((sess) => sess.id !== sessionId) };
      })
    );
    setAvailability((prev) => prev.filter((a) => a.sessionId !== sessionId));
  }, []);

  const setAvailabilityFn = useCallback(
    (
      staffId: string,
      sessionId: string,
      status: AvailabilityStatus,
      customStartTime?: string,
      customEndTime?: string,
      notes?: string
    ) => {
      setAvailability((prev) => {
        const idx = prev.findIndex(
          (a) => a.staffId === staffId && a.sessionId === sessionId
        );
        const entry: Availability = {
          staffId,
          sessionId,
          status,
          customStartTime,
          customEndTime,
          notes,
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

  const removeAvailability = useCallback((staffId: string, sessionId: string) => {
    setAvailability((prev) =>
      prev.filter((a) => !(a.staffId === staffId && a.sessionId === sessionId))
    );
  }, []);

  const getAvailability = useCallback(
    (staffId: string, sessionId: string) => {
      return availability.find(
        (a) => a.staffId === staffId && a.sessionId === sessionId
      );
    },
    [availability]
  );

  const getSessionStaffCount = useCallback(
    (sessionId: string) => {
      const sessionAvail = availability.filter((a) => a.sessionId === sessionId);
      const confirmed = sessionAvail.filter((a) => a.status === "available").length;
      const maybe = sessionAvail.filter((a) => a.status === "maybe").length;
      return { confirmed, maybe, total: confirmed + maybe };
    },
    [availability]
  );

  return (
    <SchedulingContext.Provider
      value={{
        staff,
        schedules,
        availability,
        addStaff,
        updateStaff,
        removeStaff,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        addSession,
        addSessions,
        updateSession,
        removeSession,
        setAvailability: setAvailabilityFn,
        removeAvailability,
        getAvailability,
        getSessionStaffCount,
      }}
    >
      {children}
    </SchedulingContext.Provider>
  );
}

export function useScheduling() {
  const ctx = useContext(SchedulingContext);
  if (!ctx)
    throw new Error("useScheduling must be used within SchedulingProvider");
  return ctx;
}

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
  SessionSlot,
  AutoAssignResult,
} from "./types";

interface SchedulingContextType {
  staff: Staff[];
  schedules: Schedule[];
  availability: Availability[];
  sessionSlots: SessionSlot[];
  loading: boolean;
  refreshAll: () => Promise<void>;

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

  initializeSlotsForSession: (sessionId: string, count: number) => void;
  assignStaffToSlot: (slotId: string, staffId: string) => void;
  unassignSlot: (slotId: string) => void;
  getSlotsForSession: (sessionId: string) => SessionSlot[];
  autoAssignSession: (sessionId: string) => Promise<AutoAssignResult>;
}

const SchedulingContext = createContext<SchedulingContextType | null>(null);

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

export function SchedulingProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [sessionSlots, setSessionSlots] = useState<SessionSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    try {
      const [staffData, schedData, availData, slotsData] = await Promise.all([
        apiFetch<Staff[]>("/api/staff"),
        apiFetch<Schedule[]>("/api/schedules"),
        apiFetch<Availability[]>("/api/availability"),
        apiFetch<SessionSlot[]>("/api/slots"),
      ]);
      setStaff(staffData);
      setSchedules(schedData);
      setAvailability(availData);
      setSessionSlots(slotsData);
    } catch {
      // If API fails (e.g. not authenticated), leave empty arrays
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // --------------- Staff ---------------

  const addStaff = useCallback((s: Staff) => {
    setStaff((prev) => [...prev, s]);
    apiFetch("/api/staff", {
      method: "POST",
      body: JSON.stringify(s),
    }).catch(() => {
      setStaff((prev) => prev.filter((x) => x.id !== s.id));
    });
  }, []);

  const updateStaffFn = useCallback((id: string, updates: Partial<Staff>) => {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    apiFetch(`/api/staff/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }).catch(() => {});
  }, []);

  const removeStaff = useCallback((id: string) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
    setAvailability((prev) => prev.filter((a) => a.staffId !== id));
    apiFetch(`/api/staff/${id}`, { method: "DELETE" }).catch(() => {});
  }, []);

  // --------------- Schedules ---------------

  const addSchedule = useCallback((s: Schedule) => {
    const sessions = s.sessions;
    const scheduleOnly = { ...s, sessions: [] };
    setSchedules((prev) => [...prev, s]);

    (async () => {
      await apiFetch("/api/schedules", {
        method: "POST",
        body: JSON.stringify({
          id: s.id,
          name: s.name,
          description: s.description,
          startDate: s.startDate,
          endDate: s.endDate,
        }),
      });
      if (sessions.length > 0) {
        await apiFetch(`/api/schedules/${s.id}/sessions`, {
          method: "POST",
          body: JSON.stringify({ sessions }),
        });
      }
    })().catch(() => {
      setSchedules((prev) => prev.filter((x) => x.id !== scheduleOnly.id));
    });
  }, []);

  const updateScheduleFn = useCallback((id: string, updates: Partial<Schedule>) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    apiFetch(`/api/schedules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }).catch(() => {});
  }, []);

  const deleteScheduleFn = useCallback((id: string) => {
    setSchedules((prev) => {
      const schedule = prev.find((s) => s.id === id);
      if (schedule) {
        const sessionIds = new Set(schedule.sessions.map((s) => s.id));
        setAvailability((a) => a.filter((av) => !sessionIds.has(av.sessionId)));
      }
      return prev.filter((s) => s.id !== id);
    });
    apiFetch(`/api/schedules/${id}`, { method: "DELETE" }).catch(() => {});
  }, []);

  // --------------- Sessions ---------------

  const addSession = useCallback((scheduleId: string, session: Session) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== scheduleId) return s;
        return { ...s, sessions: [...s.sessions, session] };
      })
    );
    apiFetch(`/api/schedules/${scheduleId}/sessions`, {
      method: "POST",
      body: JSON.stringify({ sessions: [session] }),
    }).catch(() => {});
  }, []);

  const addSessions = useCallback((scheduleId: string, sessions: Session[]) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== scheduleId) return s;
        return { ...s, sessions: [...s.sessions, ...sessions] };
      })
    );
    apiFetch(`/api/schedules/${scheduleId}/sessions`, {
      method: "POST",
      body: JSON.stringify({ sessions }),
    }).catch(() => {});
  }, []);

  const updateSessionFn = useCallback(
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
      apiFetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }).catch(() => {});
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
    apiFetch(`/api/sessions/${sessionId}`, { method: "DELETE" }).catch(() => {});
  }, []);

  // --------------- Availability ---------------

  const setAvailabilityFn = useCallback(
    (
      staffId: string,
      sessionId: string,
      status: AvailabilityStatus,
      customStartTime?: string,
      customEndTime?: string,
      notes?: string
    ) => {
      const entry: Availability = { staffId, sessionId, status, customStartTime, customEndTime, notes };

      setAvailability((prev) => {
        const idx = prev.findIndex(
          (a) => a.staffId === staffId && a.sessionId === sessionId
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = entry;
          return next;
        }
        return [...prev, entry];
      });

      apiFetch("/api/availability", {
        method: "POST",
        body: JSON.stringify(entry),
      }).catch(() => {});
    },
    []
  );

  const removeAvailabilityFn = useCallback((staffId: string, sessionId: string) => {
    setAvailability((prev) =>
      prev.filter((a) => !(a.staffId === staffId && a.sessionId === sessionId))
    );
    apiFetch(`/api/availability?staffId=${staffId}&sessionId=${sessionId}`, {
      method: "DELETE",
    }).catch(() => {});
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

  // --------------- Session Slots ---------------

  const initializeSlotsForSession = useCallback(
    (sessionId: string, count: number) => {
      setSessionSlots((prev) => {
        const forSession = prev
          .filter((s) => s.sessionId === sessionId)
          .sort((a, b) => a.slotIndex - b.slotIndex);
        const others = prev.filter((s) => s.sessionId !== sessionId);

        if (forSession.length === count) return prev;

        if (forSession.length < count) {
          const newSlots: SessionSlot[] = [];
          for (let i = forSession.length; i < count; i++) {
            newSlots.push({
              id: `slot-${sessionId}-${i}`,
              sessionId,
              slotIndex: i,
            });
          }
          return [...prev, ...newSlots];
        }

        const kept = forSession.slice(0, count);
        return [...others, ...kept];
      });

      apiFetch(`/api/sessions/${sessionId}/slots`, {
        method: "POST",
        body: JSON.stringify({ count }),
      }).catch(() => {});
    },
    []
  );

  const assignStaffToSlot = useCallback((slotId: string, staffId: string) => {
    setSessionSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, assignedStaffId: staffId } : s))
    );
    const sessionId = slotId.split("-").slice(1, -1).join("-");
    apiFetch(`/api/sessions/${sessionId}/slots`, {
      method: "PATCH",
      body: JSON.stringify({ slotId, staffId }),
    }).catch(() => {});
  }, []);

  const unassignSlot = useCallback((slotId: string) => {
    setSessionSlots((prev) =>
      prev.map((s) =>
        s.id === slotId ? { ...s, assignedStaffId: undefined } : s
      )
    );
    const sessionId = slotId.split("-").slice(1, -1).join("-");
    apiFetch(`/api/sessions/${sessionId}/slots`, {
      method: "PATCH",
      body: JSON.stringify({ slotId, action: "unassign" }),
    }).catch(() => {});
  }, []);

  const getSlotsForSession = useCallback(
    (sessionId: string) => {
      return sessionSlots
        .filter((s) => s.sessionId === sessionId)
        .sort((a, b) => a.slotIndex - b.slotIndex);
    },
    [sessionSlots]
  );

  const autoAssignSession = useCallback(
    async (sessionId: string): Promise<AutoAssignResult> => {
      const result = await apiFetch<AutoAssignResult>(
        `/api/sessions/${sessionId}/auto-assign`,
        { method: "POST" }
      );
      const slotsData = await apiFetch<SessionSlot[]>("/api/slots");
      setSessionSlots(slotsData);
      return result;
    },
    []
  );

  return (
    <SchedulingContext.Provider
      value={{
        staff,
        schedules,
        availability,
        sessionSlots,
        loading,
        refreshAll,
        addStaff,
        updateStaff: updateStaffFn,
        removeStaff,
        addSchedule,
        updateSchedule: updateScheduleFn,
        deleteSchedule: deleteScheduleFn,
        addSession,
        addSessions,
        updateSession: updateSessionFn,
        removeSession,
        setAvailability: setAvailabilityFn,
        removeAvailability: removeAvailabilityFn,
        getAvailability,
        getSessionStaffCount,
        initializeSlotsForSession,
        assignStaffToSlot,
        unassignSlot,
        getSlotsForSession,
        autoAssignSession,
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

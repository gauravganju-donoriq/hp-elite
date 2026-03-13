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
  SessionSlot,
} from "./types";
import { initialStaff, initialSchedules, initialAvailability } from "./data";

interface SchedulingContextType {
  staff: Staff[];
  schedules: Schedule[];
  availability: Availability[];
  sessionSlots: SessionSlot[];

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
  autoAssignAll: (scheduleId: string) => { assigned: number; empty: number };
}

const STORAGE_KEY = "hp-elite-scheduling";

const SchedulingContext = createContext<SchedulingContextType | null>(null);

interface StoredData {
  staff: Staff[];
  schedules: Schedule[];
  availability: Availability[];
  sessionSlots?: SessionSlot[];
}

function loadFromStorage(): StoredData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return null;
}

function saveToStorage(data: StoredData) {
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
  const [sessionSlots, setSessionSlots] = useState<SessionSlot[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setStaff(stored.staff);
      setSchedules(stored.schedules);
      setAvailability(stored.availability);
      if (stored.sessionSlots) setSessionSlots(stored.sessionSlots);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      saveToStorage({ staff, schedules, availability, sessionSlots });
    }
  }, [staff, schedules, availability, sessionSlots, loaded]);

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
    },
    []
  );

  const assignStaffToSlot = useCallback((slotId: string, staffId: string) => {
    setSessionSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, assignedStaffId: staffId } : s))
    );
  }, []);

  const unassignSlot = useCallback((slotId: string) => {
    setSessionSlots((prev) =>
      prev.map((s) =>
        s.id === slotId ? { ...s, assignedStaffId: undefined } : s
      )
    );
  }, []);

  const getSlotsForSession = useCallback(
    (sessionId: string) => {
      return sessionSlots
        .filter((s) => s.sessionId === sessionId)
        .sort((a, b) => a.slotIndex - b.slotIndex);
    },
    [sessionSlots]
  );

  const ROLE_PRIORITY: Record<StaffRole, number> = {
    "head-coach": 0,
    "assistant-coach": 1,
    volunteer: 2,
    intern: 3,
  };

  const autoAssignAll = useCallback(
    (scheduleId: string) => {
      const schedule = schedules.find((s) => s.id === scheduleId);
      if (!schedule) return { assigned: 0, empty: 0 };

      const assignmentCounts = new Map<string, number>();
      for (const slot of sessionSlots) {
        if (slot.assignedStaffId) {
          assignmentCounts.set(
            slot.assignedStaffId,
            (assignmentCounts.get(slot.assignedStaffId) || 0) + 1
          );
        }
      }

      let totalAssigned = 0;
      let totalEmpty = 0;

      setSessionSlots((prev) => {
        const next = [...prev];

        for (const session of schedule.sessions) {
          const sessionSlotIdxs: number[] = [];
          for (let i = 0; i < next.length; i++) {
            if (next[i].sessionId === session.id) sessionSlotIdxs.push(i);
          }

          if (sessionSlotIdxs.length < session.requiredStaff) {
            for (let i = sessionSlotIdxs.length; i < session.requiredStaff; i++) {
              const newSlot: SessionSlot = {
                id: `slot-${session.id}-${i}`,
                sessionId: session.id,
                slotIndex: i,
              };
              next.push(newSlot);
              sessionSlotIdxs.push(next.length - 1);
            }
          }

          const alreadyAssigned = new Set<string>();
          for (const idx of sessionSlotIdxs) {
            if (next[idx].assignedStaffId) alreadyAssigned.add(next[idx].assignedStaffId!);
          }

          const availableStaff = staff
            .filter((member) => {
              if (alreadyAssigned.has(member.id)) return false;
              const avail = availability.find(
                (a) => a.staffId === member.id && a.sessionId === session.id
              );
              return avail?.status === "available";
            })
            .sort((a, b) => {
              const roleDiff = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role];
              if (roleDiff !== 0) return roleDiff;
              return (assignmentCounts.get(a.id) || 0) - (assignmentCounts.get(b.id) || 0);
            });

          let staffIdx = 0;
          for (const slotIdx of sessionSlotIdxs) {
            if (next[slotIdx].assignedStaffId) continue;
            if (staffIdx < availableStaff.length) {
              next[slotIdx] = {
                ...next[slotIdx],
                assignedStaffId: availableStaff[staffIdx].id,
              };
              assignmentCounts.set(
                availableStaff[staffIdx].id,
                (assignmentCounts.get(availableStaff[staffIdx].id) || 0) + 1
              );
              totalAssigned++;
              staffIdx++;
            } else {
              totalEmpty++;
            }
          }
        }

        return next;
      });

      return { assigned: totalAssigned, empty: totalEmpty };
    },
    [schedules, staff, availability, sessionSlots]
  );

  return (
    <SchedulingContext.Provider
      value={{
        staff,
        schedules,
        availability,
        sessionSlots,
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
        initializeSlotsForSession,
        assignStaffToSlot,
        unassignSlot,
        getSlotsForSession,
        autoAssignAll,
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

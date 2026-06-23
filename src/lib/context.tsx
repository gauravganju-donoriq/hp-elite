"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { authClient } from "./auth-client";
import type {
  Staff,
  Schedule,
  Session,
  Availability,
  AvailabilityStatus,
  SessionSlot,
  AutoAssignResult,
  AutoAssignStrategy,
  ClassType,
} from "./types";

interface SchedulingContextType {
  staff: Staff[];
  schedules: Schedule[];
  availability: Availability[];
  sessionSlots: SessionSlot[];
  classTypes: ClassType[];
  loading: boolean;
  refreshAll: () => Promise<void>;

  addStaff: (s: Staff) => void;
  updateStaff: (id: string, updates: Partial<Staff>) => void;
  removeStaff: (id: string) => void;

  addClassType: (c: ClassType) => Promise<ClassType>;
  updateClassType: (id: string, updates: Partial<Omit<ClassType, "id">>) => void;
  removeClassType: (id: string) => void;

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
  assignStaffToSlot: (sessionId: string, slotId: string, staffId: string) => void;
  unassignSlot: (sessionId: string, slotId: string) => void;
  setSlotTimes: (
    sessionId: string,
    slotId: string,
    startTime: string | null,
    endTime: string | null
  ) => void;
  getSlotsForSession: (sessionId: string) => SessionSlot[];
  autoAssignSession: (
    sessionId: string,
    strategy?: AutoAssignStrategy
  ) => Promise<AutoAssignResult>;
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

/**
 * Run an optimistic-style mutation. The optimistic UI changes have already
 * been applied by the caller. If `fn` rejects, `revert` runs to restore
 * pre-change state and a toast is shown.
 */
function runMutation(
  fn: () => Promise<unknown>,
  revert: () => void,
  msg: string
) {
  fn().catch((err) => {
    revert();
    toast.error(msg);
    if (typeof console !== "undefined") {
      console.error(msg, err);
    }
  });
}

export function SchedulingProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [sessionSlots, setSessionSlots] = useState<SessionSlot[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id;
  const lastFetchedUserId = useRef<string | null>(null);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [staffData, schedData, availData, slotsData, classTypeData] = await Promise.all([
        apiFetch<Staff[]>("/api/staff"),
        apiFetch<Schedule[]>("/api/schedules"),
        apiFetch<Availability[]>("/api/availability"),
        apiFetch<SessionSlot[]>("/api/slots"),
        apiFetch<ClassType[]>("/api/class-types"),
      ]);
      setStaff(staffData);
      setSchedules(schedData);
      setAvailability(availData);
      setSessionSlots(slotsData);
      setClassTypes(classTypeData);
    } catch {
      // If API fails (e.g. not authenticated), leave empty arrays
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionPending) return;

    const currentUserId = userId ?? null;
    if (lastFetchedUserId.current === currentUserId) return;
    lastFetchedUserId.current = currentUserId;

    if (currentUserId) {
      refreshAll();
    } else {
      setStaff([]);
      setSchedules([]);
      setAvailability([]);
      setSessionSlots([]);
      setClassTypes([]);
      setLoading(false);
    }
  }, [userId, sessionPending, refreshAll]);

  // --------------- Staff ---------------

  const addStaff = useCallback((s: Staff) => {
    setStaff((prev) => [...prev, s]);
    runMutation(
      () => apiFetch("/api/staff", { method: "POST", body: JSON.stringify(s) }),
      () => setStaff((prev) => prev.filter((x) => x.id !== s.id)),
      "Couldn't add staff member. Please retry."
    );
  }, []);

  const updateStaffFn = useCallback((id: string, updates: Partial<Staff>) => {
    let prevStaff: Staff | undefined;
    setStaff((prev) => {
      prevStaff = prev.find((s) => s.id === id);
      return prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
    });
    runMutation(
      () =>
        apiFetch(`/api/staff/${id}`, {
          method: "PATCH",
          body: JSON.stringify(updates),
        }),
      () => {
        if (!prevStaff) return;
        setStaff((prev) => prev.map((s) => (s.id === id ? prevStaff! : s)));
      },
      "Couldn't update staff member. Please retry."
    );
  }, []);

  const removeStaff = useCallback((id: string) => {
    let removed: Staff | undefined;
    let removedAvail: Availability[] = [];
    let removedSlots: SessionSlot[] = [];
    setStaff((prev) => {
      removed = prev.find((s) => s.id === id);
      return prev.filter((s) => s.id !== id);
    });
    setAvailability((prev) => {
      removedAvail = prev.filter((a) => a.staffId === id);
      return prev.filter((a) => a.staffId !== id);
    });
    setSessionSlots((prev) => {
      removedSlots = prev.filter((s) => s.assignedStaffId === id);
      return prev.map((s) =>
        s.assignedStaffId === id ? { ...s, assignedStaffId: undefined } : s
      );
    });
    runMutation(
      () => apiFetch(`/api/staff/${id}`, { method: "DELETE" }),
      () => {
        if (removed) setStaff((prev) => [...prev, removed!]);
        if (removedAvail.length > 0) {
          setAvailability((prev) => [...prev, ...removedAvail]);
        }
        if (removedSlots.length > 0) {
          const restoreMap = new Map(removedSlots.map((s) => [s.id, s]));
          setSessionSlots((prev) =>
            prev.map((s) => restoreMap.get(s.id) ?? s)
          );
        }
      },
      "Couldn't remove staff member. Please retry."
    );
  }, []);

  // --------------- Class Types ---------------

  const addClassTypeFn = useCallback(async (c: ClassType): Promise<ClassType> => {
    try {
      const created = await apiFetch<ClassType>("/api/class-types", {
        method: "POST",
        body: JSON.stringify(c),
      });
      setClassTypes((prev) =>
        [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder)
      );
      return created;
    } catch (err) {
      toast.error("Couldn't create class type. Please retry.");
      throw err;
    }
  }, []);

  const updateClassTypeFn = useCallback(
    (id: string, updates: Partial<Omit<ClassType, "id">>) => {
      let prevEntry: ClassType | undefined;
      setClassTypes((prev) => {
        prevEntry = prev.find((c) => c.id === id);
        return prev
          .map((c) => (c.id === id ? { ...c, ...updates } : c))
          .sort((a, b) => a.sortOrder - b.sortOrder);
      });
      runMutation(
        () =>
          apiFetch(`/api/class-types/${id}`, {
            method: "PATCH",
            body: JSON.stringify(updates),
          }),
        () => {
          if (!prevEntry) return;
          setClassTypes((prev) =>
            prev
              .map((c) => (c.id === id ? prevEntry! : c))
              .sort((a, b) => a.sortOrder - b.sortOrder)
          );
        },
        "Couldn't update class type. Please retry."
      );
    },
    []
  );

  const removeClassTypeFn = useCallback((id: string) => {
    let removed: ClassType | undefined;
    let prevSchedules: Schedule[] = [];
    setClassTypes((prev) => {
      removed = prev.find((c) => c.id === id);
      return prev.filter((c) => c.id !== id);
    });
    setSchedules((prev) => {
      prevSchedules = prev;
      return prev.map((s) => ({
        ...s,
        sessions: s.sessions.map((sess) =>
          sess.classType === id ? { ...sess, classType: undefined } : sess
        ),
      }));
    });
    runMutation(
      () => apiFetch(`/api/class-types/${id}`, { method: "DELETE" }),
      () => {
        if (removed) {
          setClassTypes((prev) =>
            [...prev, removed!].sort((a, b) => a.sortOrder - b.sortOrder)
          );
        }
        setSchedules(prevSchedules);
      },
      "Couldn't remove class type. Please retry."
    );
  }, []);

  // --------------- Schedules ---------------

  const addSchedule = useCallback((s: Schedule) => {
    const sessions = s.sessions;
    setSchedules((prev) => [...prev, s]);
    runMutation(
      async () => {
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
      },
      () => setSchedules((prev) => prev.filter((x) => x.id !== s.id)),
      "Couldn't create schedule. Please retry."
    );
  }, []);

  const updateScheduleFn = useCallback(
    (id: string, updates: Partial<Schedule>) => {
      let prevSched: Schedule | undefined;
      setSchedules((prev) => {
        prevSched = prev.find((s) => s.id === id);
        return prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
      });
      runMutation(
        () =>
          apiFetch(`/api/schedules/${id}`, {
            method: "PATCH",
            body: JSON.stringify(updates),
          }),
        () => {
          if (!prevSched) return;
          setSchedules((prev) => prev.map((s) => (s.id === id ? prevSched! : s)));
        },
        "Couldn't update schedule. Please retry."
      );
    },
    []
  );

  const deleteScheduleFn = useCallback((id: string) => {
    let removed: Schedule | undefined;
    let removedAvail: Availability[] = [];
    setSchedules((prev) => {
      removed = prev.find((s) => s.id === id);
      return prev.filter((s) => s.id !== id);
    });
    setAvailability((prev) => {
      if (!removed) return prev;
      const sessionIds = new Set(removed.sessions.map((s) => s.id));
      removedAvail = prev.filter((a) => sessionIds.has(a.sessionId));
      return prev.filter((a) => !sessionIds.has(a.sessionId));
    });
    runMutation(
      () => apiFetch(`/api/schedules/${id}`, { method: "DELETE" }),
      () => {
        if (removed) setSchedules((prev) => [...prev, removed!]);
        if (removedAvail.length > 0) {
          setAvailability((prev) => [...prev, ...removedAvail]);
        }
      },
      "Couldn't delete schedule. Please retry."
    );
  }, []);

  // --------------- Sessions ---------------

  const addSession = useCallback((scheduleId: string, session: Session) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.id !== scheduleId ? s : { ...s, sessions: [...s.sessions, session] }
      )
    );
    runMutation(
      () =>
        apiFetch(`/api/schedules/${scheduleId}/sessions`, {
          method: "POST",
          body: JSON.stringify({ sessions: [session] }),
        }),
      () =>
        setSchedules((prev) =>
          prev.map((s) =>
            s.id !== scheduleId
              ? s
              : { ...s, sessions: s.sessions.filter((x) => x.id !== session.id) }
          )
        ),
      "Couldn't add session. Please retry."
    );
  }, []);

  const addSessions = useCallback((scheduleId: string, sessions: Session[]) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.id !== scheduleId ? s : { ...s, sessions: [...s.sessions, ...sessions] }
      )
    );
    runMutation(
      () =>
        apiFetch(`/api/schedules/${scheduleId}/sessions`, {
          method: "POST",
          body: JSON.stringify({ sessions }),
        }),
      () => {
        const ids = new Set(sessions.map((x) => x.id));
        setSchedules((prev) =>
          prev.map((s) =>
            s.id !== scheduleId
              ? s
              : { ...s, sessions: s.sessions.filter((x) => !ids.has(x.id)) }
          )
        );
      },
      "Couldn't add sessions. Please retry."
    );
  }, []);

  const updateSessionFn = useCallback(
    (scheduleId: string, sessionId: string, updates: Partial<Session>) => {
      let prevSession: Session | undefined;
      setSchedules((prev) =>
        prev.map((s) => {
          if (s.id !== scheduleId) return s;
          return {
            ...s,
            sessions: s.sessions.map((sess) => {
              if (sess.id !== sessionId) return sess;
              prevSession = sess;
              return { ...sess, ...updates };
            }),
          };
        })
      );
      runMutation(
        () =>
          apiFetch(`/api/sessions/${sessionId}`, {
            method: "PATCH",
            body: JSON.stringify(updates),
          }),
        () => {
          if (!prevSession) return;
          setSchedules((prev) =>
            prev.map((s) =>
              s.id !== scheduleId
                ? s
                : {
                    ...s,
                    sessions: s.sessions.map((sess) =>
                      sess.id === sessionId ? prevSession! : sess
                    ),
                  }
            )
          );
        },
        "Couldn't update session. Please retry."
      );
    },
    []
  );

  const removeSession = useCallback((scheduleId: string, sessionId: string) => {
    let removed: Session | undefined;
    let removedAvail: Availability[] = [];
    let removedSlots: SessionSlot[] = [];
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== scheduleId) return s;
        removed = s.sessions.find((x) => x.id === sessionId);
        return {
          ...s,
          sessions: s.sessions.filter((sess) => sess.id !== sessionId),
        };
      })
    );
    setAvailability((prev) => {
      removedAvail = prev.filter((a) => a.sessionId === sessionId);
      return prev.filter((a) => a.sessionId !== sessionId);
    });
    setSessionSlots((prev) => {
      removedSlots = prev.filter((s) => s.sessionId === sessionId);
      return prev.filter((s) => s.sessionId !== sessionId);
    });
    runMutation(
      () => apiFetch(`/api/sessions/${sessionId}`, { method: "DELETE" }),
      () => {
        if (removed) {
          const restored = removed;
          setSchedules((prev) =>
            prev.map((s) =>
              s.id !== scheduleId
                ? s
                : { ...s, sessions: [...s.sessions, restored] }
            )
          );
        }
        if (removedAvail.length > 0) {
          setAvailability((prev) => [...prev, ...removedAvail]);
        }
        if (removedSlots.length > 0) {
          setSessionSlots((prev) => [...prev, ...removedSlots]);
        }
      },
      "Couldn't delete session. Please retry."
    );
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
      const entry: Availability = {
        staffId,
        sessionId,
        status,
        customStartTime,
        customEndTime,
        notes,
      };

      let prevEntry: Availability | undefined;
      let wasNew = false;
      setAvailability((prev) => {
        const idx = prev.findIndex(
          (a) => a.staffId === staffId && a.sessionId === sessionId
        );
        if (idx >= 0) {
          prevEntry = prev[idx];
          const next = [...prev];
          next[idx] = entry;
          return next;
        }
        wasNew = true;
        return [...prev, entry];
      });

      runMutation(
        () =>
          apiFetch("/api/availability", {
            method: "POST",
            body: JSON.stringify(entry),
          }),
        () => {
          if (wasNew) {
            setAvailability((prev) =>
              prev.filter(
                (a) => !(a.staffId === staffId && a.sessionId === sessionId)
              )
            );
          } else if (prevEntry) {
            const restore = prevEntry;
            setAvailability((prev) =>
              prev.map((a) =>
                a.staffId === staffId && a.sessionId === sessionId ? restore : a
              )
            );
          }
        },
        "Couldn't save availability. Please retry."
      );
    },
    []
  );

  const removeAvailabilityFn = useCallback(
    (staffId: string, sessionId: string) => {
      let removed: Availability | undefined;
      setAvailability((prev) => {
        removed = prev.find(
          (a) => a.staffId === staffId && a.sessionId === sessionId
        );
        return prev.filter(
          (a) => !(a.staffId === staffId && a.sessionId === sessionId)
        );
      });
      runMutation(
        () =>
          apiFetch(
            `/api/availability?staffId=${staffId}&sessionId=${sessionId}`,
            { method: "DELETE" }
          ),
        () => {
          if (removed) setAvailability((prev) => [...prev, removed!]);
        },
        "Couldn't clear availability. Please retry."
      );
    },
    []
  );

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
      let snapshot: SessionSlot[] = [];
      setSessionSlots((prev) => {
        snapshot = prev;
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

      runMutation(
        () =>
          apiFetch(`/api/sessions/${sessionId}/slots`, {
            method: "POST",
            body: JSON.stringify({ count }),
          }),
        () => setSessionSlots(snapshot),
        "Couldn't update slot count. Please retry."
      );
    },
    []
  );

  const assignStaffToSlot = useCallback(
    (sessionId: string, slotId: string, staffId: string) => {
      let prevAssigned: string | undefined;
      setSessionSlots((prev) =>
        prev.map((s) => {
          if (s.id !== slotId) return s;
          prevAssigned = s.assignedStaffId;
          return { ...s, assignedStaffId: staffId };
        })
      );
      runMutation(
        () =>
          apiFetch(`/api/sessions/${sessionId}/slots`, {
            method: "PATCH",
            body: JSON.stringify({ slotId, staffId }),
          }),
        () =>
          setSessionSlots((prev) =>
            prev.map((s) =>
              s.id === slotId ? { ...s, assignedStaffId: prevAssigned } : s
            )
          ),
        "Couldn't assign staff. Please retry."
      );
    },
    []
  );

  const unassignSlot = useCallback((sessionId: string, slotId: string) => {
    let prevAssigned: string | undefined;
    setSessionSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        prevAssigned = s.assignedStaffId;
        return { ...s, assignedStaffId: undefined };
      })
    );
    runMutation(
      () =>
        apiFetch(`/api/sessions/${sessionId}/slots`, {
          method: "PATCH",
          body: JSON.stringify({ slotId, action: "unassign" }),
        }),
      () => {
        if (prevAssigned === undefined) return;
        const restore = prevAssigned;
        setSessionSlots((prev) =>
          prev.map((s) =>
            s.id === slotId ? { ...s, assignedStaffId: restore } : s
          )
        );
      },
      "Couldn't unassign slot. Please retry."
    );
  }, []);

  const setSlotTimes = useCallback(
    (
      sessionId: string,
      slotId: string,
      startTime: string | null,
      endTime: string | null
    ) => {
      let prev: Pick<SessionSlot, "assignedStartTime" | "assignedEndTime"> | undefined;
      setSessionSlots((slots) =>
        slots.map((s) => {
          if (s.id !== slotId) return s;
          prev = {
            assignedStartTime: s.assignedStartTime,
            assignedEndTime: s.assignedEndTime,
          };
          return {
            ...s,
            assignedStartTime: startTime ?? undefined,
            assignedEndTime: endTime ?? undefined,
          };
        })
      );
      runMutation(
        () =>
          apiFetch(`/api/sessions/${sessionId}/slots`, {
            method: "PATCH",
            body: JSON.stringify({ slotId, action: "set-times", startTime, endTime }),
          }),
        () => {
          if (!prev) return;
          const restore = prev;
          setSessionSlots((slots) =>
            slots.map((s) => (s.id === slotId ? { ...s, ...restore } : s))
          );
        },
        "Couldn't update worked time. Please retry."
      );
    },
    []
  );

  const getSlotsForSession = useCallback(
    (sessionId: string) => {
      return sessionSlots
        .filter((s) => s.sessionId === sessionId)
        .sort((a, b) => a.slotIndex - b.slotIndex);
    },
    [sessionSlots]
  );

  const autoAssignSession = useCallback(
    async (
      sessionId: string,
      strategy: AutoAssignStrategy = "balanced"
    ): Promise<AutoAssignResult> => {
      const result = await apiFetch<AutoAssignResult>(
        `/api/sessions/${sessionId}/auto-assign`,
        { method: "POST", body: JSON.stringify({ strategy }) }
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
        classTypes,
        loading,
        refreshAll,
        addStaff,
        updateStaff: updateStaffFn,
        removeStaff,
        addClassType: addClassTypeFn,
        updateClassType: updateClassTypeFn,
        removeClassType: removeClassTypeFn,
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
        setSlotTimes,
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

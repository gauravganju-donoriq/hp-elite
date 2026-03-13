"use client";

import { useEffect, useMemo, useState } from "react";
import { useScheduling } from "@/lib/context";
import type { Schedule, Session, SessionSlot, SlotType } from "@/lib/types";
import {
  SlotAssignmentPopover,
  SLOT_TYPE_CONFIG,
} from "@/components/slot-assignment-popover";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Minus, Plus, Settings2, Sparkles } from "lucide-react";
import { toast } from "sonner";

function SlotChip({
  slot,
  session,
  allSlots,
}: {
  slot: SessionSlot;
  session: Session;
  allSlots: SessionSlot[];
}) {
  const { staff } = useScheduling();
  const assignedMember = slot.assignedStaffId
    ? staff.find((m) => m.id === slot.assignedStaffId)
    : null;

  return (
    <SlotAssignmentPopover slot={slot} session={session} allSlots={allSlots}>
      <button
        className={cn(
          "w-full rounded border px-1.5 py-1 text-left text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
          assignedMember
            ? "bg-green-50 text-green-900 border-green-300 hover:bg-green-100"
            : "bg-muted/30 text-muted-foreground border-dashed hover:bg-muted hover:border-solid"
        )}
      >
        {assignedMember ? (
          <span className="truncate font-semibold">
            {assignedMember.firstName[0]}. {assignedMember.lastName}
          </span>
        ) : (
          <span className="text-muted-foreground/60">+ assign</span>
        )}
      </button>
    </SlotAssignmentPopover>
  );
}

function SessionConfigPopover({
  session,
  schedule,
  children,
}: {
  session: Session;
  schedule: Schedule;
  children: React.ReactNode;
}) {
  const { updateSession, initializeSlotsForSession } = useScheduling();
  const [open, setOpen] = useState(false);
  const [staffCount, setStaffCount] = useState(session.requiredStaff);

  function handleSelectType(type: SlotType) {
    updateSession(schedule.id, session.id, { classType: type });
  }

  function handleStaffChange(delta: number) {
    const next = Math.max(1, staffCount + delta);
    setStaffCount(next);
    updateSession(schedule.id, session.id, { requiredStaff: next });
    initializeSlotsForSession(session.id, next);
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) setStaffCount(session.requiredStaff);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-3 space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Class Type
            </p>
            <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
              {(
                Object.entries(SLOT_TYPE_CONFIG) as [
                  SlotType,
                  { label: string; color: string },
                ][]
              ).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => handleSelectType(type)}
                  className={cn(
                    "text-left text-xs px-2 py-1.5 rounded border transition-colors",
                    session.classType === type
                      ? "ring-2 ring-ring"
                      : "hover:bg-accent",
                    config.color
                  )}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Staff Needed
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleStaffChange(-1)}
                disabled={staffCount <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-semibold w-6 text-center">
                {staffCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleStaffChange(1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return {
    dayAbbr: d.toLocaleDateString("en-US", { weekday: "short" }),
    monthDay: d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  };
}

export function SessionSlotsPanel({ schedule }: { schedule: Schedule }) {
  const {
    autoAssignAll,
    initializeSlotsForSession,
    getSlotsForSession,
    sessionSlots,
  } = useScheduling();

  const sessions = useMemo(
    () =>
      [...schedule.sessions].sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.startTime.localeCompare(b.startTime)
      ),
    [schedule.sessions]
  );

  useEffect(() => {
    for (const session of sessions) {
      initializeSlotsForSession(session.id, session.requiredStaff);
    }
  }, [sessions, initializeSlotsForSession]);

  const slotsBySession = useMemo(() => {
    const map = new Map<string, SessionSlot[]>();
    for (const session of sessions) {
      map.set(session.id, getSlotsForSession(session.id));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, getSlotsForSession, sessionSlots]);

  const timeColumns = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) {
      set.add(`${s.startTime}–${s.endTime}`);
    }
    return [...set].sort((a, b) => {
      const toMin = (t: string) => {
        const part = t.split("–")[0].trim();
        const [time, ampm] = part.split(" ");
        const [h_, m] = time.split(":").map(Number);
        let h = h_;
        if (ampm === "PM" && h !== 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;
        return h * 60 + m;
      };
      return toMin(a) - toMin(b);
    });
  }, [sessions]);

  const dates = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) set.add(s.date);
    return [...set].sort();
  }, [sessions]);

  const sessionGrid = useMemo(() => {
    const map = new Map<string, Session>();
    for (const s of sessions) {
      map.set(`${s.date}|${s.startTime}–${s.endTime}`, s);
    }
    return map;
  }, [sessions]);

  function handleAutoAssign() {
    const { assigned, empty } = autoAssignAll(schedule.id);
    if (assigned > 0 && empty === 0) {
      toast.success(`Auto-assigned ${assigned} staff. All slots filled!`);
    } else if (assigned > 0) {
      toast.success(
        `Auto-assigned ${assigned} staff. ${empty} slot${empty > 1 ? "s" : ""} still empty.`
      );
    } else {
      toast.info("No additional staff could be auto-assigned.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Staff Assignments</h2>
        <Button size="sm" onClick={handleAutoAssign}>
          <Sparkles className="h-4 w-4 mr-1" />
          Auto Assign
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="sticky left-0 z-20 bg-muted/95 backdrop-blur px-3 py-2 text-left font-medium min-w-[120px] border-r">
                Time
              </th>
              {dates.map((date) => {
                const { dayAbbr, monthDay } = formatDayLabel(date);
                return (
                  <th
                    key={date}
                    className="px-1 py-2 text-center font-normal min-w-[150px] border-r last:border-r-0"
                  >
                    <div className="text-xs font-medium">{dayAbbr}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {monthDay}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {timeColumns.map((tc) => (
              <tr key={tc} className="border-b hover:bg-muted/10">
                <td className="sticky left-0 z-10 bg-background px-3 py-2 font-medium whitespace-nowrap align-top border-r">
                  <div className="text-xs font-semibold">
                    {tc.split("–")[0]}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {tc.split("–")[1]}
                  </div>
                </td>
                {dates.map((date) => {
                  const session = sessionGrid.get(`${date}|${tc}`);
                  if (!session) {
                    return (
                      <td
                        key={date}
                        className="px-1 py-1 align-top border-r last:border-r-0 bg-muted/5"
                      />
                    );
                  }

                  const slots = slotsBySession.get(session.id) || [];
                  const assigned = slots.filter(
                    (s) => s.assignedStaffId
                  ).length;
                  const isFull = assigned >= session.requiredStaff;
                  const loc =
                    session.location === "Field House"
                      ? "FH"
                      : session.location === "K Sport"
                        ? "KS"
                        : session.location;
                  const classConfig = session.classType
                    ? SLOT_TYPE_CONFIG[session.classType]
                    : null;

                  return (
                    <td
                      key={date}
                      className="px-1.5 py-1.5 align-top border-r last:border-r-0"
                    >
                      <div className="space-y-1">
                        <SessionConfigPopover
                          session={session}
                          schedule={schedule}
                        >
                          <button className="w-full flex items-center justify-between gap-1 rounded px-1 py-0.5 text-[10px] transition-colors hover:bg-muted group">
                            <div className="flex items-center gap-1 min-w-0">
                              {classConfig ? (
                                <span
                                  className={cn(
                                    "px-1 py-0.5 rounded text-[9px] font-medium truncate border",
                                    classConfig.color
                                  )}
                                >
                                  {classConfig.label}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/60 italic">
                                  Set class…
                                </span>
                              )}
                              <span className="text-muted-foreground">
                                {loc}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span
                                className={cn(
                                  "font-semibold",
                                  isFull
                                    ? "text-green-600"
                                    : "text-red-600"
                                )}
                              >
                                {assigned}/{session.requiredStaff}
                              </span>
                              <Settings2 className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        </SessionConfigPopover>
                        <div className="flex flex-col gap-0.5">
                          {slots.map((slot) => (
                            <SlotChip
                              key={slot.id}
                              slot={slot}
                              session={session}
                              allSlots={slots}
                            />
                          ))}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScheduling } from "@/lib/context";
import type { Schedule, Session, SessionSlot, SlotType, AutoAssignConflict } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  SlotAssignmentPopover,
  SLOT_TYPE_CONFIG,
} from "@/components/slot-assignment-popover";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AlertTriangle, CalendarPlus, ChevronLeft, ChevronRight, Minus, Plus, Settings2, Sparkles, Trash2 } from "lucide-react";
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
  const { updateSession, removeSession, initializeSlotsForSession } = useScheduling();
  const [open, setOpen] = useState(false);
  const [staffCount, setStaffCount] = useState(session.requiredStaff);
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);
  const [location, setLocation] = useState(session.location);

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
    if (isOpen) {
      setStaffCount(session.requiredStaff);
      setStartTime(session.startTime);
      setEndTime(session.endTime);
      setLocation(session.location);
    }
  }

  function handleSaveDetails() {
    const updates: Partial<Session> = {};
    if (startTime !== session.startTime) updates.startTime = startTime;
    if (endTime !== session.endTime) updates.endTime = endTime;
    if (location !== session.location) updates.location = location;
    if (Object.keys(updates).length > 0) {
      updateSession(schedule.id, session.id, updates);
      toast.success("Session updated.");
    }
  }

  function handleDeleteSession() {
    removeSession(schedule.id, session.id);
    toast.success("Session deleted.");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
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

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Session Details
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Start Time</Label>
                <Input
                  className="h-7 text-xs"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="5:00 PM"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">End Time</Label>
                <Input
                  className="h-7 text-xs"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="8:00 PM"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Location</Label>
              <Input
                className="h-7 text-xs"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Field House"
              />
            </div>
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handleSaveDetails}
            >
              Save Details
            </Button>
          </div>

          <Separator />

          <Button
            variant="destructive"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={handleDeleteSession}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete Session
          </Button>
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

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function AddSessionDialog({ schedule }: { schedule: Schedule }) {
  const { addSession } = useScheduling();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("5:00 PM");
  const [endTime, setEndTime] = useState("8:00 PM");
  const [location, setLocation] = useState("Field House");
  const [requiredStaff, setRequiredStaff] = useState(8);

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setDate("");
      setStartTime("5:00 PM");
      setEndTime("8:00 PM");
      setLocation("Field House");
      setRequiredStaff(8);
    }
  }

  function handleAdd() {
    if (!date) {
      toast.error("Please select a date.");
      return;
    }
    const d = new Date(date + "T12:00:00");
    const dayOfWeek = DAYS[d.getDay()];
    const session: Session = {
      id: `sess-${schedule.id}-${Date.now()}`,
      scheduleId: schedule.id,
      date,
      dayOfWeek,
      startTime,
      endTime,
      location,
      requiredStaff,
    };
    addSession(schedule.id, session);
    toast.success("Session added.");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarPlus className="h-4 w-4 mr-1" />
          Add Session
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Session</DialogTitle>
          <DialogDescription>
            Add a new training session to this schedule.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="add-sess-date">Date *</Label>
            <Input
              id="add-sess-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={schedule.startDate}
              max={schedule.endDate}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-sess-start">Start Time</Label>
              <Input
                id="add-sess-start"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="5:00 PM"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-sess-end">End Time</Label>
              <Input
                id="add-sess-end"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="8:00 PM"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-sess-location">Location</Label>
            <Input
              id="add-sess-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Field House"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-sess-staff">Staff Needed</Label>
            <Input
              id="add-sess-staff"
              type="number"
              min={1}
              value={requiredStaff}
              onChange={(e) => setRequiredStaff(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add Session</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConflictResolutionDialog({
  conflicts,
  open,
  onOpenChange,
}: {
  conflicts: AutoAssignConflict[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {conflicts.length} Session{conflicts.length !== 1 ? "s" : ""} Need Attention
          </DialogTitle>
          <DialogDescription>
            The following sessions could not be fully staffed by auto-assign.
            Review each conflict and resolve manually.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto space-y-3 pr-1">
          {conflicts.map((c) => {
            const d = new Date(c.date + "T12:00:00");
            const dateLabel = d.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            return (
              <div
                key={c.sessionId}
                className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">
                    {dateLabel} &middot; {c.startTime} &ndash; {c.endTime}
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {c.unfilledCount} unfilled
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{c.location}</span>
                  {c.classType && <span>&middot; {c.classType}</span>}
                  <span>&middot; {c.assignedCount}/{c.requiredStaff} staffed</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-700">{c.availableCount} available</span>
                  {c.maybeCount > 0 && (
                    <span className="text-yellow-700">{c.maybeCount} maybe</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {c.reason}
                </p>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SessionSlotsPanel({ schedule }: { schedule: Schedule }) {
  const {
    autoAssignAll,
    getSlotsForSession,
    initializeSlotsForSession,
    sessionSlots,
  } = useScheduling();

  const [conflicts, setConflicts] = useState<AutoAssignConflict[]>([]);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  const sessions = useMemo(
    () =>
      [...schedule.sessions].sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.startTime.localeCompare(b.startTime)
      ),
    [schedule.sessions]
  );

  const initializedRef = useRef(new Set<string>());

  useEffect(() => {
    for (const session of sessions) {
      if (initializedRef.current.has(session.id)) continue;
      const slots = getSlotsForSession(session.id);
      if (slots.length === 0 && session.requiredStaff > 0) {
        initializedRef.current.add(session.id);
        initializeSlotsForSession(session.id, session.requiredStaff);
      }
    }
  }, [sessions, getSlotsForSession, initializeSlotsForSession]);

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const SCROLL_AMOUNT = 450;

  const scrollLeft = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -SCROLL_AMOUNT, behavior: "smooth" });
  }, []);

  const scrollRight = useCallback(() => {
    scrollRef.current?.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" });
  }, []);

  async function handleAutoAssign() {
    try {
      const result = await autoAssignAll(schedule.id);
      if (result.assigned > 0 && result.empty === 0) {
        toast.success(`Auto-assigned ${result.assigned} staff. All slots filled!`);
      } else if (result.assigned > 0 && result.conflicts.length > 0) {
        toast.success(`Auto-assigned ${result.assigned} staff.`);
        setConflicts(result.conflicts);
        setConflictDialogOpen(true);
      } else if (result.conflicts.length > 0) {
        setConflicts(result.conflicts);
        setConflictDialogOpen(true);
      } else {
        toast.info("No additional staff could be auto-assigned.");
      }
    } catch {
      toast.error("Auto-assign failed.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Staff Assignments</h2>
        <div className="flex items-center gap-2">
          {dates.length >= 10 && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={scrollLeft}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={scrollRight}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <AddSessionDialog schedule={schedule} />
          <Button size="sm" onClick={handleAutoAssign}>
            <Sparkles className="h-4 w-4 mr-1" />
            Auto Assign
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-x-auto rounded-lg border">
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

      <ConflictResolutionDialog
        conflicts={conflicts}
        open={conflictDialogOpen}
        onOpenChange={setConflictDialogOpen}
      />
    </div>
  );
}

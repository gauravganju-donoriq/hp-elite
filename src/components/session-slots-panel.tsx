"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScheduling } from "@/lib/context";
import type {
  Schedule,
  Session,
  SessionSlot,
  AutoAssignConflict,
  AutoAssignProfile,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { SlotAssignmentPopover } from "@/components/slot-assignment-popover";
import { getPaletteEntry } from "@/lib/class-type-colors";
import {
  addDays,
  dayNameLong,
  formatDateDisplay,
  formatISODate,
  parseISODate,
  todayISO,
} from "@/lib/dates";
import { formatTimeCompact, parseTimeToMinutes } from "@/lib/time";
import { buildSessionGrid } from "@/lib/session-grid";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AlertTriangle, CalendarPlus, ChevronLeft, ChevronRight, Clock, Eraser, Loader2, Minus, Plus, Settings2, Sparkles, Trash2 } from "lucide-react";
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

  const isPartial = Boolean(slot.assignedStartTime || slot.assignedEndTime);
  const workedStart = slot.assignedStartTime ?? session.startTime;
  const workedEnd = slot.assignedEndTime ?? session.endTime;

  return (
    <SlotAssignmentPopover slot={slot} session={session} allSlots={allSlots}>
      <button
        className={cn(
          "w-full rounded-md border px-1.5 py-1.5 text-left text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          assignedMember
            ? isPartial
              ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
              : "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "border-dashed bg-muted/30 text-muted-foreground hover:border-solid hover:bg-muted"
        )}
      >
        {assignedMember ? (
          <span className="flex flex-col leading-tight">
            <span className="truncate font-semibold">
              {assignedMember.firstName[0]}. {assignedMember.lastName}
            </span>
            {isPartial && (
              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300">
                <Clock className="h-2.5 w-2.5 shrink-0" />
                {formatTimeCompact(workedStart)}–{formatTimeCompact(workedEnd)}
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground/60">+ assign</span>
        )}
      </button>
    </SlotAssignmentPopover>
  );
}

function AutoAssignPopover({
  profiles,
  onSelect,
  isLoading,
}: {
  profiles: AutoAssignProfile[];
  onSelect: (profileId: string) => void | Promise<void>;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);

  function handlePick(profileId: string) {
    setOpen(false);
    void onSelect(profileId);
  }

  if (isLoading) {
    return (
      <div
        title="Auto-assigning…"
        aria-label="Auto-assigning staff to this class"
        role="status"
        className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Auto assign staff to this class"
          aria-label="Auto assign staff to this class"
          className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <Sparkles className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="px-2 py-1.5">
          <p className="text-xs font-semibold">Auto-assign</p>
          <p className="text-[10px] text-muted-foreground">
            Fill empty slots using a profile.
          </p>
        </div>
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto p-1">
          {profiles.length === 0 && (
            <p className="px-2 py-2 text-[10px] text-muted-foreground italic">
              No profiles yet. Create one in Settings.
            </p>
          )}
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => handlePick(profile.id)}
              className="w-full rounded px-2 py-1.5 text-left hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <div className="text-xs font-medium">{profile.name}</div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
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
  const {
    updateSession,
    removeSession,
    initializeSlotsForSession,
    clearAssignmentsForSessions,
    classTypes,
  } = useScheduling();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staffCount, setStaffCount] = useState(session.requiredStaff);
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);
  const [location, setLocation] = useState(session.location);

  const sortedClassTypes = useMemo(
    () =>
      [...classTypes].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)
      ),
    [classTypes]
  );

  function handleSelectType(typeId: string) {
    updateSession(schedule.id, session.id, { classType: typeId });
  }

  function handleStaffChange(delta: number) {
    setStaffCount((prev) => Math.max(1, prev + delta));
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

  async function handleSaveDetails() {
    if (saving) return;
    const updates: Partial<Session> = {};
    if (startTime !== session.startTime) updates.startTime = startTime;
    if (endTime !== session.endTime) updates.endTime = endTime;
    if (location !== session.location) updates.location = location;
    const staffCountChanged = staffCount !== session.requiredStaff;
    if (staffCountChanged) updates.requiredStaff = staffCount;
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (Object.keys(updates).length > 0) {
      updateSession(schedule.id, session.id, updates);
    }
    if (staffCountChanged) {
      initializeSlotsForSession(session.id, staffCount);
    }
    setSaving(false);
    toast.success("Changes saved successfully.");
  }

  function handleDeleteSession() {
    removeSession(schedule.id, session.id);
    toast.success("Session deleted.");
    setOpen(false);
  }

  async function handleClearAssignments() {
    try {
      await clearAssignmentsForSessions([session.id]);
      toast.success("Assignments cleared for this session.");
      setOpen(false);
    } catch {
      // error toast handled in context
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="max-h-[calc(100dvh-8rem)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto p-0"
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={{ top: 80, bottom: 16, left: 16, right: 16 }}
        avoidCollisions
      >
        <div className="p-3 space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Class Type
            </p>
            <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
              {sortedClassTypes.length === 0 && (
                <p className="col-span-2 text-xs text-muted-foreground italic px-1 py-2">
                  No class types yet. Add some in Settings.
                </p>
              )}
              {sortedClassTypes.map((ct) => {
                const palette = getPaletteEntry(ct.colorKey);
                return (
                  <button
                    key={ct.id}
                    onClick={() => handleSelectType(ct.id)}
                    className={cn(
                      "text-left text-xs px-2 py-1.5 rounded border transition-colors",
                      session.classType === ct.id
                        ? "ring-2 ring-ring"
                        : "hover:bg-accent",
                      palette.color
                    )}
                  >
                    {ct.label}
                  </button>
                );
              })}
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
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Details"
              )}
            </Button>
          </div>

          <Separator />

          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={handleClearAssignments}
          >
            <Eraser className="h-3 w-3 mr-1" />
            Clear Assignments
          </Button>

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
  const f = formatDateDisplay(dateStr);
  return { dayAbbr: f.dayAbbr, monthDay: f.monthDay };
}

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
    const dayOfWeek = dayNameLong(date);
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
          <div className="grid gap-4 sm:grid-cols-2">
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
            const dateLabel = formatDateDisplay(c.date).shortLong;
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

type ViewMode = "day" | "week";

function clampToRange(iso: string, start: string, end: string): string {
  if (iso < start) return start;
  if (iso > end) return end;
  return iso;
}

export function SessionSlotsPanel({ schedule }: { schedule: Schedule }) {
  const {
    autoAssignSession,
    autoAssignSessions,
    clearAssignmentsForSessions,
    getSlotsForSession,
    initializeSlotsForSession,
    sessionSlots,
    classTypes,
    autoAssignProfiles,
  } = useScheduling();

  const [conflicts, setConflicts] = useState<AutoAssignConflict[]>([]);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [autoAssigningSessionIds, setAutoAssigningSessionIds] = useState<
    Set<string>
  >(new Set());

  const [view, setView] = useState<ViewMode>("day");
  const [anchor, setAnchor] = useState<string>(() => {
    const clampedToday = clampToRange(
      todayISO(),
      schedule.startDate,
      schedule.endDate
    );
    const sessionDates = schedule.sessions.map((s) => s.date);
    // Prefer today when it has sessions; otherwise land on the nearest upcoming
    // session date (or the last one if all are in the past).
    if (sessionDates.includes(clampedToday)) return clampedToday;
    const sorted = [...sessionDates].sort();
    const upcoming = sorted.find((d) => d >= clampedToday);
    return upcoming ?? sorted[sorted.length - 1] ?? clampedToday;
  });
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [scopeBusy, setScopeBusy] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const sortedProfiles = useMemo(
    () =>
      [...autoAssignProfiles].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
      ),
    [autoAssignProfiles]
  );

  // Keep a valid profile selected as profiles load/change.
  useEffect(() => {
    if (sortedProfiles.length === 0) {
      if (selectedProfileId !== "") setSelectedProfileId("");
      return;
    }
    if (!sortedProfiles.some((p) => p.id === selectedProfileId)) {
      setSelectedProfileId(sortedProfiles[0].id);
    }
  }, [sortedProfiles, selectedProfileId]);

  const allSessions = useMemo(
    () =>
      [...schedule.sessions].sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.startTime.localeCompare(b.startTime)
      ),
    [schedule.sessions]
  );

  // The dates currently in scope, driven by the day/week view + anchor.
  const visibleDates = useMemo(() => {
    if (view === "day") return [anchor];
    const start = parseISODate(anchor);
    const weekStart = addDays(start, -start.getUTCDay());
    return Array.from({ length: 7 }, (_, i) =>
      formatISODate(addDays(weekStart, i))
    );
  }, [view, anchor]);

  const visibleDateSet = useMemo(() => new Set(visibleDates), [visibleDates]);

  // Sessions limited to the current view scope; everything below renders from
  // this so the grid only shows the selected day or week.
  const sessions = useMemo(
    () => allSessions.filter((s) => visibleDateSet.has(s.date)),
    [allSessions, visibleDateSet]
  );

  const scopedSessionIds = useMemo(
    () => sessions.map((s) => s.id),
    [sessions]
  );

  const reconciledRef = useRef(new Set<string>());

  useEffect(() => {
    for (const session of allSessions) {
      if (session.requiredStaff <= 0) continue;
      const slots = getSlotsForSession(session.id);
      if (slots.length === session.requiredStaff) continue;
      // Self-heal any session whose slot rows drifted from its required
      // staff count (e.g. a slot write that never committed). Keyed by the
      // target count so we only attempt each reconcile once.
      const key = `${session.id}:${session.requiredStaff}`;
      if (reconciledRef.current.has(key)) continue;
      reconciledRef.current.add(key);
      initializeSlotsForSession(session.id, session.requiredStaff);
    }
  }, [allSessions, getSlotsForSession, initializeSlotsForSession]);

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
      const toMin = (t: string) => parseTimeToMinutes(t.split("–")[0].trim());
      const am = toMin(a);
      const bm = toMin(b);
      if (Number.isNaN(am) || Number.isNaN(bm)) return a.localeCompare(b);
      return am - bm;
    });
  }, [sessions]);

  const dates = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) set.add(s.date);
    return [...set].sort();
  }, [sessions]);

  const sessionGrid = useMemo(() => buildSessionGrid(sessions), [sessions]);

  const scrollRef = useRef<HTMLDivElement>(null);

  async function handleAutoAssignSession(session: Session, profileId: string) {
    if (autoAssigningSessionIds.has(session.id)) return;
    setAutoAssigningSessionIds((prev) => {
      const next = new Set(prev);
      next.add(session.id);
      return next;
    });
    try {
      const result = await autoAssignSession(session.id, profileId);
      if (result.assigned > 0 && result.conflicts.length === 0) {
        toast.success(
          `Assigned ${result.assigned} staff to this session.`
        );
      } else if (result.assigned > 0 && result.conflicts.length > 0) {
        toast.success(`Assigned ${result.assigned} staff.`);
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
    } finally {
      setAutoAssigningSessionIds((prev) => {
        const next = new Set(prev);
        next.delete(session.id);
        return next;
      });
    }
  }

  const viewLabel = view === "day" ? "day" : "week";

  const shift = useCallback(
    (dir: 1 | -1) => {
      const step = view === "day" ? 1 : 7;
      setAnchor((prev) =>
        formatISODate(addDays(parseISODate(prev), dir * step))
      );
    },
    [view]
  );

  const goToday = useCallback(() => {
    setAnchor(clampToRange(todayISO(), schedule.startDate, schedule.endDate));
  }, [schedule.startDate, schedule.endDate]);

  async function handleAutoAssignScope() {
    if (scopeBusy) return;
    if (!selectedProfileId) {
      toast.error("Create an auto-assign profile in Settings first.");
      return;
    }
    if (scopedSessionIds.length === 0) {
      toast.info(`No sessions in this ${viewLabel}.`);
      return;
    }
    setScopeBusy(true);
    try {
      const result = await autoAssignSessions(
        schedule.id,
        scopedSessionIds,
        selectedProfileId,
        false
      );
      if (result.assigned > 0) {
        toast.success(`Assigned ${result.assigned} staff across this ${viewLabel}.`);
      } else if (result.conflicts.length === 0) {
        toast.info("No additional staff could be auto-assigned.");
      }
      if (result.conflicts.length > 0) {
        setConflicts(result.conflicts);
        setConflictDialogOpen(true);
      }
    } catch {
      toast.error("Auto-assign failed.");
    } finally {
      setScopeBusy(false);
    }
  }

  async function handleClearScope() {
    if (scopeBusy) return;
    setClearDialogOpen(false);
    if (scopedSessionIds.length === 0) {
      toast.info(`No sessions in this ${viewLabel}.`);
      return;
    }
    setScopeBusy(true);
    try {
      await clearAssignmentsForSessions(scopedSessionIds);
      toast.success(`Cleared all assignments for this ${viewLabel}.`);
    } catch {
      // error toast handled in context
    } finally {
      setScopeBusy(false);
    }
  }

  const rangeLabel =
    view === "day"
      ? formatDateDisplay(anchor).fullLong
      : `${formatDateDisplay(visibleDates[0]).shortLong} – ${formatDateDisplay(visibleDates[visibleDates.length - 1]).shortLong}`;

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
          Staff Assignments
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
            {(["day", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  view === v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => shift(-1)}
              aria-label={`Previous ${viewLabel}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => shift(1)}
              aria-label={`Next ${viewLabel}`}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <AddSessionDialog schedule={schedule} />
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-3 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold">{rangeLabel}</p>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <Select
            value={selectedProfileId}
            onValueChange={setSelectedProfileId}
            disabled={sortedProfiles.length === 0}
          >
            <SelectTrigger className="col-span-2 h-8 w-full sm:w-[180px]">
              <SelectValue placeholder="Select a profile" />
            </SelectTrigger>
            <SelectContent>
              {sortedProfiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="w-full sm:w-auto"
            onClick={handleAutoAssignScope}
            disabled={scopeBusy || sortedProfiles.length === 0 || scopedSessionIds.length === 0}
          >
            {scopeBusy ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            Auto-assign {viewLabel}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => setClearDialogOpen(true)}
            disabled={scopeBusy || scopedSessionIds.length === 0}
          >
            <Eraser className="h-4 w-4 mr-1" />
            Clear {viewLabel}
          </Button>
        </div>
      </div>

      {dates.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No sessions in this {viewLabel}. Use the navigation above or add a
          session.
        </div>
      ) : (
      <div className="space-y-1.5">
      <p className="flex items-center gap-1 text-xs text-muted-foreground lg:hidden">
        <ChevronLeft className="size-3" />
        Swipe to see all days
        <ChevronRight className="size-3" />
      </p>
      <div ref={scrollRef} className="scroll-fade-x no-scrollbar overflow-x-auto rounded-lg border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="sticky left-0 z-20 min-w-[105px] border-r bg-muted/95 px-2 py-2 text-left font-medium backdrop-blur sm:min-w-[120px] sm:px-3">
                Time
              </th>
              {dates.map((date) => {
                const { dayAbbr, monthDay } = formatDayLabel(date);
                return (
                  <th
                    key={date}
                    className="min-w-[130px] border-r px-1 py-2 text-center font-normal last:border-r-0 sm:min-w-[150px]"
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
                <td className="sticky left-0 z-10 whitespace-nowrap border-r bg-background px-2 py-2 align-top font-medium sm:px-3">
                  <div className="text-xs font-semibold">
                    {tc.split("–")[0]}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {tc.split("–")[1]}
                  </div>
                </td>
                {dates.map((date) => {
                  const cellSessions = sessionGrid.get(`${date}|${tc}`) || [];
                  if (cellSessions.length === 0) {
                    return (
                      <td
                        key={date}
                        className="px-1 py-1 align-top border-r last:border-r-0 bg-muted/5"
                      />
                    );
                  }

                  return (
                    <td
                      key={date}
                      className="px-1.5 py-1.5 align-top border-r last:border-r-0"
                    >
                      <div className="space-y-2">
                        {cellSessions.map((session, sIdx) => {
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
                          const classType = session.classType
                            ? classTypes.find((c) => c.id === session.classType)
                            : null;
                          const classConfig = classType
                            ? {
                                label: classType.label,
                                color: getPaletteEntry(classType.colorKey).color,
                              }
                            : null;

                          return (
                            <div
                              key={session.id}
                              className={cn(
                                "space-y-1",
                                sIdx > 0 && "border-t pt-2"
                              )}
                            >
                              <div className="flex items-center gap-0.5">
                                <SessionConfigPopover
                                  session={session}
                                  schedule={schedule}
                                >
                                  <button className="group flex min-w-0 flex-1 items-center justify-between gap-1 rounded px-1 py-1 text-[11px] transition-colors hover:bg-muted">
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
                                <AutoAssignPopover
                                  profiles={sortedProfiles}
                                  isLoading={autoAssigningSessionIds.has(session.id)}
                                  onSelect={(profileId) =>
                                    handleAutoAssignSession(session, profileId)
                                  }
                                />
                              </div>
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
                          );
                        })}
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
      )}

      <ConflictResolutionDialog
        conflicts={conflicts}
        open={conflictDialogOpen}
        onOpenChange={setConflictDialogOpen}
      />

      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear this {viewLabel}?
            </DialogTitle>
            <DialogDescription>
              This removes <strong>all</strong> staff assignments (including any
              you set manually) from every session in this {viewLabel}. You can
              re-assign afterwards with any profile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearScope}>
              Clear {viewLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

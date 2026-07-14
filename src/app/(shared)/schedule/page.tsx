"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  MapPin,
  Printer,
  TriangleAlert,
  UserRoundCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { OverviewStat, OverviewStats } from "@/components/overview-stats";
import { EmptyState, LoadingState } from "@/components/states";
import { useScheduling } from "@/lib/context";
import { useStaffIdentity } from "@/lib/staff-context";
import {
  addDays,
  formatDateDisplay,
  formatISODate,
  parseISODate,
  todayISO,
} from "@/lib/dates";
import { parseTimeToMinutes } from "@/lib/time";
import { getPaletteEntry } from "@/lib/class-type-colors";
import { cn } from "@/lib/utils";
import type {
  BoardSession,
  ClassType,
  ScheduleBoard,
} from "@/lib/types";

type ViewMode = "day" | "week";

function clampToRange(iso: string, start: string, end: string): string {
  if (iso < start) return start;
  if (iso > end) return end;
  return iso;
}

export default function SchedulePage() {
  const { schedules, loading: schedulesLoading } = useScheduling();
  const { identity } = useStaffIdentity();
  const currentStaffId = identity?.staffId ?? null;

  const [scheduleId, setScheduleId] = useState<string>("");
  const [view, setView] = useState<ViewMode>("day");
  const [anchor, setAnchor] = useState<string>(todayISO());
  const [board, setBoard] = useState<ScheduleBoard | null>(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const captureRef = useRef<HTMLDivElement>(null);

  // Pick a sensible default schedule: the one whose range contains today,
  // otherwise the most recent.
  useEffect(() => {
    if (scheduleId || schedules.length === 0) return;
    const today = todayISO();
    const current = schedules.find(
      (s) => today >= s.startDate && today <= s.endDate
    );
    const picked = current ?? schedules[0];
    setScheduleId(picked.id);
    setAnchor(clampToRange(today, picked.startDate, picked.endDate));
  }, [schedules, scheduleId]);

  const selectedSchedule = useMemo(
    () => schedules.find((s) => s.id === scheduleId) ?? null,
    [schedules, scheduleId]
  );

  // Load the composed board for the selected schedule.
  useEffect(() => {
    if (!scheduleId) {
      setBoard(null);
      return;
    }
    let cancelled = false;
    setBoardLoading(true);
    fetch(`/api/schedules/${scheduleId}/board`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load schedule");
        return res.json() as Promise<ScheduleBoard>;
      })
      .then((data) => {
        if (!cancelled) setBoard(data);
      })
      .catch(() => {
        if (!cancelled) {
          setBoard(null);
          toast.error("Couldn't load the schedule. Please retry.");
        }
      })
      .finally(() => {
        if (!cancelled) setBoardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scheduleId]);

  const classTypeById = useMemo(() => {
    const map = new Map<string, ClassType>();
    for (const c of board?.classTypes ?? []) map.set(c.id, c);
    return map;
  }, [board]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, BoardSession[]>();
    for (const s of board?.sessions ?? []) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime) ||
          a.startTime.localeCompare(b.startTime) ||
          a.location.localeCompare(b.location)
      );
    }
    return map;
  }, [board]);

  // The list of dates currently being shown.
  const visibleDates = useMemo(() => {
    if (view === "day") return [anchor];
    const start = parseISODate(anchor);
    const weekStart = addDays(start, -start.getUTCDay());
    return Array.from({ length: 7 }, (_, i) =>
      formatISODate(addDays(weekStart, i))
    );
  }, [view, anchor]);

  const navigationDates = useMemo(() => {
    const start = parseISODate(anchor);
    const weekStart = addDays(start, -start.getUTCDay());
    return Array.from({ length: 7 }, (_, i) =>
      formatISODate(addDays(weekStart, i))
    );
  }, [anchor]);

  const daysWithSessions = visibleDates
    .map((date) => ({ date, sessions: sessionsByDate.get(date) ?? [] }))
    .filter((d) => d.sessions.length > 0);

  const visibleSessions = daysWithSessions.flatMap((day) => day.sessions);
  const scopeStats = {
    sessions: visibleSessions.length,
    assigned: visibleSessions.reduce(
      (total, session) => total + session.scheduled.length,
      0
    ),
    open: visibleSessions.reduce(
      (total, session) =>
        total + Math.max(session.requiredStaff - session.scheduled.length, 0),
      0
    ),
  };

  const rangeLabel = useMemo(() => {
    if (view === "day") return formatDateDisplay(anchor).fullLong;
    const first = visibleDates[0];
    const last = visibleDates[visibleDates.length - 1];
    return `${formatDateDisplay(first).shortLong} – ${formatDateDisplay(last).shortLong}`;
  }, [view, anchor, visibleDates]);

  const shift = useCallback(
    (dir: 1 | -1) => {
      const step = view === "day" ? 1 : 7;
      setAnchor((prev) => {
        const next = formatISODate(addDays(parseISODate(prev), dir * step));
        return selectedSchedule
          ? clampToRange(next, selectedSchedule.startDate, selectedSchedule.endDate)
          : next;
      });
    },
    [view, selectedSchedule]
  );

  const goToday = useCallback(() => {
    if (selectedSchedule) {
      setAnchor(
        clampToRange(todayISO(), selectedSchedule.startDate, selectedSchedule.endDate)
      );
    } else {
      setAnchor(todayISO());
    }
  }, [selectedSchedule]);

  const handleScheduleChange = useCallback(
    (nextScheduleId: string) => {
      const nextSchedule = schedules.find((s) => s.id === nextScheduleId);
      setScheduleId(nextScheduleId);
      if (nextSchedule) {
        setAnchor(
          clampToRange(todayISO(), nextSchedule.startDate, nextSchedule.endDate)
        );
      }
    },
    [schedules]
  );

  const handleExport = useCallback(async () => {
    if (!captureRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(captureRef.current, {
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
      });
      const link = document.createElement("a");
      const namePart = (board?.schedule.name ?? "schedule")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      link.download = `${namePart}-${view}-${anchor}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Image saved. You can now text or share it.");
    } catch {
      toast.error("Couldn't export the image. Please retry.");
    } finally {
      setExporting(false);
    }
  }, [board, view, anchor]);

  if (schedulesLoading) {
    return <LoadingState label="Loading schedule..." />;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Schedule"
          description="Who is scheduled and who is available, at a glance."
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                disabled={!board}
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                size="sm"
                onClick={handleExport}
                disabled={!board || exporting}
              >
                <Download className="h-4 w-4" />
                {exporting ? "Exporting..." : "Export image"}
              </Button>
            </>
          }
        />
      </div>

      {schedules.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No schedules yet" />
      ) : (
        <>
          <div className="rounded-xl border bg-card p-3 shadow-sm print:hidden">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Select value={scheduleId} onValueChange={handleScheduleChange}>
                <SelectTrigger className="w-full lg:w-72">
                  <SelectValue placeholder="Select a schedule" />
                </SelectTrigger>
                <SelectContent>
                  {schedules.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
                <div className="inline-flex rounded-lg bg-muted p-1">
                  {(["day", "week"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      aria-pressed={view === v}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors focus-visible:ring-2 focus-visible:ring-ring",
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
                    className="h-9 w-9"
                    onClick={() => shift(-1)}
                    aria-label={`Previous ${view}`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToday}>
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => shift(1)}
                    aria-label={`Next ${view}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="scroll-fade-x no-scrollbar mt-3 flex gap-1 overflow-x-auto border-t pt-3 sm:grid sm:grid-cols-7 sm:gap-2 sm:overflow-visible">
              {navigationDates.map((date) => {
                const dateDisplay = formatDateDisplay(date);
                const count = sessionsByDate.get(date)?.length ?? 0;
                const isSelected = date === anchor;
                const isToday = date === todayISO();
                const isInSchedule =
                  !selectedSchedule ||
                  (date >= selectedSchedule.startDate &&
                    date <= selectedSchedule.endDate);
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={!isInSchedule}
                    onClick={() => {
                      setAnchor(date);
                      setView("day");
                    }}
                    className={cn(
                      "group min-w-11 shrink-0 rounded-lg px-1 py-2 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-35 sm:min-w-0 sm:px-2",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                    aria-label={`${dateDisplay.fullLong}, ${count} session${count === 1 ? "" : "s"}`}
                  >
                    <span
                      className={cn(
                        "block text-[10px] font-semibold uppercase tracking-wide sm:text-xs",
                        isSelected
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      )}
                    >
                      {dateDisplay.dayAbbr}
                    </span>
                    <span className="mt-0.5 block text-sm font-semibold sm:text-base">
                      {parseISODate(date).getUTCDate()}
                    </span>
                    <span
                      className={cn(
                        "mx-auto mt-1 block size-1.5 rounded-full",
                        count > 0
                          ? isSelected
                            ? "bg-primary-foreground"
                            : "bg-primary"
                          : "bg-transparent",
                        isToday && !isSelected && "ring-2 ring-primary/30 ring-offset-1"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div
            ref={captureRef}
            className="overflow-hidden rounded-xl border bg-card shadow-sm"
          >
            <div className="border-b bg-muted/30 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-10">
                    <CalendarDays className="size-4 sm:size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold leading-tight">
                    {board?.schedule.name ?? selectedSchedule?.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {rangeLabel}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {view} view
                </Badge>
              </div>

              {!boardLoading && (
                <OverviewStats className="mt-4">
                  <OverviewStat
                    icon={CalendarDays}
                    label="Sessions"
                    value={scopeStats.sessions}
                    detail={`In this ${view}`}
                  />
                  <OverviewStat
                    icon={UserRoundCheck}
                    label="Assigned"
                    value={scopeStats.assigned}
                    detail="Staff placements"
                  />
                  <OverviewStat
                    icon={scopeStats.open > 0 ? TriangleAlert : CheckCircle2}
                    label={scopeStats.open > 0 ? "Open spots" : "Coverage"}
                    value={scopeStats.open > 0 ? scopeStats.open : "Full"}
                    tone={scopeStats.open > 0 ? "warning" : "success"}
                    detail={
                      scopeStats.open > 0
                        ? "Still need coverage"
                        : "All spots covered"
                    }
                  />
                </OverviewStats>
              )}
            </div>

            <div className="p-4 sm:p-6">
              {boardLoading ? (
                <LoadingState label="Loading sessions..." />
              ) : daysWithSessions.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-12 text-center">
                  <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
                  <p className="font-medium">No sessions in this {view}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use the date controls above to browse the schedule.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {daysWithSessions.map(({ date, sessions }) => (
                    <DaySection
                      key={date}
                      date={date}
                      sessions={sessions}
                      classTypeById={classTypeById}
                      currentStaffId={currentStaffId}
                      showDayHeading={view === "week"}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DaySection({
  date,
  sessions,
  classTypeById,
  currentStaffId,
  showDayHeading,
}: {
  date: string;
  sessions: BoardSession[];
  classTypeById: Map<string, ClassType>;
  currentStaffId: string | null;
  showDayHeading: boolean;
}) {
  const d = formatDateDisplay(date);
  return (
    <section className="space-y-4">
      {showDayHeading && (
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold">{d.fullLong}</h2>
            <p className="text-xs text-muted-foreground">
              {sessions.length} session{sessions.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}
      <div className="space-y-3">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            classType={session.classType ? classTypeById.get(session.classType) : undefined}
            currentStaffId={currentStaffId}
          />
        ))}
      </div>
    </section>
  );
}

function SessionCard({
  session,
  classType,
  currentStaffId,
}: {
  session: BoardSession;
  classType?: ClassType;
  currentStaffId: string | null;
}) {
  const palette = getPaletteEntry(classType?.colorKey);
  const filled = session.scheduled.length;
  const required = session.requiredStaff;
  const understaffed = filled < required;
  const coverage = required > 0 ? Math.min((filled / required) * 100, 100) : 100;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-background shadow-sm",
        understaffed && "border-amber-300/80 dark:border-amber-800"
      )}
    >
      <div className="grid sm:grid-cols-[9rem_1fr]">
        <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3 sm:block sm:border-r sm:border-b-0 sm:px-5 sm:py-5">
          <div>
            <p className="flex items-center gap-1.5 text-base font-semibold tabular-nums">
              <Clock className="h-4 w-4 text-primary" />
              {session.startTime}
            </p>
            <p className="ml-5 text-xs text-muted-foreground">
              until {session.endTime}
            </p>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground sm:mt-4">
            <MapPin className="h-3.5 w-3.5" />
            <span className="max-w-full truncate sm:max-w-28">{session.location}</span>
          </span>
        </div>

        <div className="min-w-0 p-3 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {classType ? (
                <span
                  className={cn(
                    "inline-flex rounded-md border px-2 py-1 text-xs font-semibold",
                    palette.color
                  )}
                >
                  {classType.label}
                </span>
              ) : (
                <span className="text-sm font-medium">Training session</span>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn(
                "gap-1",
                understaffed
                  ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                  : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              )}
            >
              {understaffed ? (
                <TriangleAlert className="h-3 w-3" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {understaffed
                ? `${required - filled} spot${required - filled === 1 ? "" : "s"} open`
                : "Fully staffed"}
            </Badge>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium">Staff coverage</span>
              <span className="tabular-nums text-muted-foreground">
                {filled} of {required} assigned
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  understaffed ? "bg-amber-500" : "bg-emerald-500"
                )}
                style={{ width: `${coverage}%` }}
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Scheduled team
            </p>
            {session.scheduled.length === 0 ? (
              <div className="mt-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                No one assigned yet
              </div>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {session.scheduled.map((s) => {
                  const isMe = s.staffId === currentStaffId;
                  return (
                    <li
                      key={s.staffId}
                      className={cn(
                        "inline-flex min-w-0 items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-sm",
                        isMe && "border-primary/40 bg-primary/10",
                        s.adjusted &&
                          "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground",
                          isMe && "bg-primary text-primary-foreground"
                        )}
                      >
                        {initialsForName(s.name)}
                      </span>
                      <span className="font-medium">
                        {s.name}
                        {isMe && (
                          <span className="ml-1 text-[10px] text-primary">
                            (you)
                          </span>
                        )}
                      </span>
                      {s.adjusted && (
                        <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                          <Clock className="h-3 w-3" />
                          {s.startTime}–{s.endTime}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {session.available.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
                <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:pt-0.5">
                  Also available
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {session.available.map((a, i) => {
                    const isMe = a.staffId === currentStaffId;
                    return (
                      <span key={a.staffId}>
                        {i > 0 && <span aria-hidden="true"> · </span>}
                        <span className={cn(isMe && "font-semibold text-foreground")}>
                          {a.name}
                          {isMe && " (you)"}
                        </span>
                        {a.status === "maybe" && (
                          <span className="text-amber-700 dark:text-amber-300">
                            {" "}
                            (maybe)
                          </span>
                        )}
                      </span>
                    );
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function initialsForName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

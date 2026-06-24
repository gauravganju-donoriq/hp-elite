"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  MapPin,
  Printer,
  Users,
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

  // Only render days that actually have sessions, but keep the full week
  // window for the empty-state check.
  const daysWithSessions = visibleDates
    .map((date) => ({ date, sessions: sessionsByDate.get(date) ?? [] }))
    .filter((d) => d.sessions.length > 0);

  const rangeLabel = useMemo(() => {
    if (view === "day") return formatDateDisplay(anchor).fullLong;
    const first = visibleDates[0];
    const last = visibleDates[visibleDates.length - 1];
    return `${formatDateDisplay(first).shortLong} – ${formatDateDisplay(last).shortLong}`;
  }, [view, anchor, visibleDates]);

  const shift = useCallback(
    (dir: 1 | -1) => {
      const step = view === "day" ? 1 : 7;
      setAnchor((prev) => formatISODate(addDays(parseISODate(prev), dir * step)));
    },
    [view]
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
    return (
      <div className="py-12 text-center text-muted-foreground">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
          <p className="text-muted-foreground">
            Who is scheduled and who is available, at a glance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            disabled={!board}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button size="sm" onClick={handleExport} disabled={!board || exporting}>
            <Download className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export image"}
          </Button>
        </div>
      </div>

      {schedules.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          No schedules yet.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <Select value={scheduleId} onValueChange={setScheduleId}>
              <SelectTrigger className="w-full sm:w-64">
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

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md border p-0.5">
                {(["day", "week"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      "rounded px-3 py-1 text-sm capitalize transition-colors",
                      view === v
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToday}>
                  Today
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div
            ref={captureRef}
            className="space-y-5 rounded-xl border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 border-b pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold leading-tight">
                    {board?.schedule.name ?? selectedSchedule?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">{rangeLabel}</p>
                </div>
              </div>
              <Badge variant="secondary" className="capitalize">
                {view} view
              </Badge>
            </div>

            {boardLoading ? (
              <div className="py-10 text-center text-muted-foreground">Loading...</div>
            ) : daysWithSessions.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                No sessions in this {view}.
              </div>
            ) : (
              <div className="space-y-6">
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
    <section className="space-y-3">
      {showDayHeading && (
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {d.fullLong}
        </h2>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
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

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {session.startTime}–{session.endTime}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {classType && (
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[11px] font-medium",
                  palette.color
                )}
              >
                {classType.label}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {session.location}
            </span>
          </div>
        </div>
        <span
          className={cn(
            "flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium",
            understaffed
              ? "bg-yellow-100 text-yellow-800"
              : "bg-green-100 text-green-800"
          )}
        >
          <Users className="h-3 w-3" />
          {filled}/{required}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Scheduled
          </p>
          {session.scheduled.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">No one assigned yet</p>
          ) : (
            <ul className="mt-1 space-y-0.5">
              {session.scheduled.map((s) => {
                const isMe = s.staffId === currentStaffId;
                return (
                  <li
                    key={s.staffId}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded px-1.5 py-0.5 text-sm",
                      isMe && "bg-primary/10 font-medium",
                      s.adjusted && "bg-amber-50"
                    )}
                  >
                    <span className="truncate">
                      {s.name}
                      {isMe && (
                        <span className="ml-1 text-[10px] text-primary">(you)</span>
                      )}
                    </span>
                    {s.adjusted && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                        <Clock className="h-3 w-3 shrink-0" />
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
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Also available
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {session.available.map((a, i) => {
                const isMe = a.staffId === currentStaffId;
                return (
                  <span key={a.staffId}>
                    {i > 0 && ", "}
                    <span className={cn(isMe && "font-medium text-foreground")}>
                      {a.name}
                      {isMe && " (you)"}
                    </span>
                    {a.status === "maybe" && (
                      <span className="text-[10px]"> (maybe)</span>
                    )}
                  </span>
                );
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

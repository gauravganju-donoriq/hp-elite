"use client";

import { useRouter } from "next/navigation";
import { useStaffIdentity } from "@/lib/staff-context";
import { useScheduling } from "@/lib/context";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarCheck2,
  CalendarDays,
  Clock,
  MapPin,
  Zap,
  Info,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Check,
} from "lucide-react";
import type { AvailabilityStatus, Session } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  formatDateDisplay,
  monthYear,
  parseISODate,
  todayISO,
} from "@/lib/dates";
import { buildCalendarWeeks } from "@/lib/availability-calendar";
import { AVAILABILITY_STATUS } from "@/lib/availability-status";
import { LoadingState } from "@/components/states";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Single source of truth for availability presentation lives in
// @/lib/availability-status; adapt it to the shape this screen renders.
const STATUS_CONFIG = Object.fromEntries(
  Object.entries(AVAILABILITY_STATUS).map(([key, v]) => [
    key,
    {
      label: v.label,
      description: v.description,
      icon: <v.Icon className="h-4 w-4" />,
      btnClass: v.btnClass,
      btnTint: v.btnTint,
      cellBg: v.cellBg,
      dot: v.dot,
      badgeClass: v.badgeClass,
    },
  ])
) as Record<
  AvailabilityStatus,
  {
    label: string;
    description: string;
    icon: React.ReactNode;
    btnClass: string;
    btnTint: string;
    cellBg: string;
    dot: string;
    badgeClass: string;
  }
>;

function formatFullDate(dateStr: string) {
  return formatDateDisplay(dateStr).fullLong;
}

export default function AvailabilityPage() {
  const router = useRouter();
  const { identity, loading: identityLoading } = useStaffIdentity();
  const { staff, schedules, availability, setAvailability, loading: dataLoading } = useScheduling();
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [expandedMobileSession, setExpandedMobileSession] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(() => {
    const t = parseISODate(todayISO());
    return t.getUTCFullYear();
  });
  const [viewMonthIdx, setViewMonthIdx] = useState(() => {
    const t = parseISODate(todayISO());
    return t.getUTCMonth();
  });

  // Note: when the user is authenticated but unlinked, the staff layout
  // renders an UnlinkedAccount banner before this page mounts. No redirect.
  useEffect(() => {
    // Intentionally empty: prior behaviour redirected to /login, which
    // caused a loop for unlinked users. Now handled in (staff)/layout.tsx.
  }, [identity, identityLoading, router]);

  const activeScheduleId = selectedSchedule || (schedules.length > 0 ? schedules[0].id : "");

  if (identityLoading || dataLoading) {
    return <LoadingState label="Loading your availability..." />;
  }

  if (!identity) return null;

  const currentStaff = staff.find((s) => s.id === identity.staffId);
  if (!currentStaff) return null;

  const schedule = schedules.find((s) => s.id === activeScheduleId);
  const sessions = schedule
    ? [...schedule.sessions].sort((a, b) => a.date.localeCompare(b.date))
    : [];

  const allWeeks = buildCalendarWeeks(sessions);

  function goToPrevMonth() {
    if (viewMonthIdx === 0) {
      setViewYear((y) => y - 1);
      setViewMonthIdx(11);
    } else {
      setViewMonthIdx((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonthIdx === 11) {
      setViewYear((y) => y + 1);
      setViewMonthIdx(0);
    } else {
      setViewMonthIdx((m) => m + 1);
    }
  }

  function goToToday() {
    const t = parseISODate(todayISO());
    setViewYear(t.getUTCFullYear());
    setViewMonthIdx(t.getUTCMonth());
  }

  const weeks = allWeeks.filter((week) =>
    week.some((day) => {
      const { year, month } = monthYear(day.date);
      return year === viewYear && month === viewMonthIdx;
    })
  );

  const viewMonthLabel = new Date(viewYear, viewMonthIdx).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );

  const filteredMobileSessions = sessions.filter((s) => {
    const { year, month } = monthYear(s.date);
    return year === viewYear && month === viewMonthIdx;
  });

  const sessionMonths = new Set(
    sessions.map((s) => {
      const { year, month } = monthYear(s.date);
      return `${year}-${month}`;
    })
  );
  const hasPrevMonth = sessionMonths.has(
    viewMonthIdx === 0
      ? `${viewYear - 1}-11`
      : `${viewYear}-${viewMonthIdx - 1}`
  );
  const hasNextMonth = sessionMonths.has(
    viewMonthIdx === 11
      ? `${viewYear + 1}-0`
      : `${viewYear}-${viewMonthIdx + 1}`
  );

  const myAvailMap = new Map(
    availability
      .filter((a) => a.staffId === identity.staffId)
      .map((a) => [a.sessionId, a])
  );

  function handleStatusChange(sessionId: string, status: AvailabilityStatus) {
    const existing = myAvailMap.get(sessionId);
    setAvailability(
      identity!.staffId,
      sessionId,
      status,
      existing?.customStartTime,
      existing?.customEndTime
    );
  }

  function handleCustomTimeChange(
    sessionId: string,
    field: "customStartTime" | "customEndTime",
    value: string
  ) {
    const existing = myAvailMap.get(sessionId);
    const status = existing?.status || "available";
    setAvailability(
      identity!.staffId,
      sessionId,
      status,
      field === "customStartTime"
        ? value || undefined
        : existing?.customStartTime,
      field === "customEndTime" ? value || undefined : existing?.customEndTime
    );
  }

  function handleBulkSet(status: AvailabilityStatus) {
    let count = 0;
    for (const s of sessions) {
      if (!myAvailMap.has(s.id)) {
        setAvailability(identity!.staffId, s.id, status);
        count++;
      }
    }
    if (count > 0) {
      toast.success(
        `Marked ${count} remaining session${count > 1 ? "s" : ""} as ${STATUS_CONFIG[status].label.toLowerCase()}`
      );
    }
  }

  const responded = sessions.filter((s) => myAvailMap.has(s.id)).length;
  const counts = {
    available: sessions.filter(
      (s) => myAvailMap.get(s.id)?.status === "available"
    ).length,
    unavailable: sessions.filter(
      (s) => myAvailMap.get(s.id)?.status === "unavailable"
    ).length,
    maybe: sessions.filter((s) => myAvailMap.get(s.id)?.status === "maybe")
      .length,
    pending: sessions.length - responded,
  };

  const pct =
    sessions.length > 0 ? Math.round((responded / sessions.length) * 100) : 0;
  const todayStr = todayISO();

  function renderStatusButtons(session: Session, entry: ReturnType<typeof myAvailMap.get>, mobile?: boolean) {
    return (
      <div className={cn("grid grid-cols-3", mobile ? "gap-2" : "gap-1.5")}>
        {(["available", "unavailable", "maybe"] as AvailabilityStatus[]).map((s) => (
          <button
            type="button"
            key={s}
            aria-pressed={entry?.status === s}
            onClick={() => {
              handleStatusChange(session.id, s);
              if (s !== "available") {
                setOpenPopover(null);
                setExpandedMobileSession(null);
              }
            }}
            className={cn(
              "flex flex-col items-center rounded-lg border font-medium outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring/50",
              mobile ? "gap-1.5 px-2 py-3.5 text-xs sm:text-sm" : "gap-1 px-2 py-2.5 text-xs",
              entry?.status === s
                ? cn(STATUS_CONFIG[s].btnClass, "ring-2 ring-current/15")
                : STATUS_CONFIG[s].btnTint
            )}
          >
            {mobile
              ? <span className="[&>svg]:h-5 [&>svg]:w-5">{STATUS_CONFIG[s].icon}</span>
              : STATUS_CONFIG[s].icon}
            {mobile
              ? s === "available"
                ? "Yes"
                : s === "unavailable"
                  ? "No"
                  : "Maybe"
              : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>
    );
  }

  function renderCustomTime(
    session: Session,
    entry: ReturnType<typeof myAvailMap.get>,
    surface: "mobile" | "desktop"
  ) {
    if (entry?.status !== "available") return null;
    return (
      <div className="mt-2 space-y-2 rounded-lg border bg-background/70 p-3">
        <div>
          <p className="text-xs font-medium">Need a different time?</p>
          <p className="text-[11px] text-muted-foreground">
            Optionally share the window you can work.
          </p>
        </div>
        <div
          className={cn(
            "grid items-end gap-2",
            surface === "mobile"
              ? "grid-cols-1"
              : "grid-cols-[1fr_auto_1fr]"
          )}
        >
          <div className="space-y-1">
            <Label
              htmlFor={`${surface}-${session.id}-custom-start`}
              className="text-[11px] text-muted-foreground"
            >
              From
            </Label>
            <Input
              id={`${surface}-${session.id}-custom-start`}
              className="h-9 text-base sm:text-xs"
              placeholder="5:00 PM"
              value={entry.customStartTime || ""}
              onChange={(e) =>
                handleCustomTimeChange(session.id, "customStartTime", e.target.value)
              }
            />
          </div>
          <span
            className={cn(
              "pb-2.5 text-xs text-muted-foreground",
              surface === "mobile" && "hidden"
            )}
          >
            to
          </span>
          <div className="space-y-1">
            <Label
              htmlFor={`${surface}-${session.id}-custom-end`}
              className="text-[11px] text-muted-foreground"
            >
              Until
            </Label>
            <Input
              id={`${surface}-${session.id}-custom-end`}
              className="h-9 text-base sm:text-xs"
              placeholder="8:00 PM"
              value={entry.customEndTime || ""}
              onChange={(e) =>
                handleCustomTimeChange(session.id, "customEndTime", e.target.value)
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="overflow-hidden border-primary/15 bg-linear-to-br from-primary/10 via-card to-card">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm sm:size-12">
                <CalendarCheck2 className="size-5 sm:size-6" />
              </span>
              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Staff portal
                </p>
                <h1 className="text-xl font-bold tracking-tight sm:text-3xl">
                  My Availability
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hi {currentStaff.firstName}, let the team know when you can work.
                </p>
              </div>
            </div>

            {schedules.length > 1 && (
              <div className="w-full space-y-1.5 sm:w-64">
                <Label className="text-xs font-medium text-muted-foreground">
                  Schedule
                </Label>
                <Select value={activeScheduleId} onValueChange={setSelectedSchedule}>
                  <SelectTrigger className="w-full bg-background/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {schedules.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {schedule ? (
        <>
          {counts.pending > 0 && counts.pending === sessions.length && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-start gap-3 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Info className="size-4 text-primary" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Start with a session below</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    Choose Available, Maybe, or Unavailable. In a hurry? Use a quick
                    action to answer every remaining session at once.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div
            className={cn(
              "grid gap-4",
              counts.pending > 0 && "lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)]"
            )}
          >
            <Card>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Your progress
                    </p>
                    <p className="mt-1 text-lg font-bold">
                      {responded} of {sessions.length} answered
                    </p>
                  </div>
                  <span
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      pct === 100
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {pct}%
                  </span>
                </div>
                <div
                  className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label="Availability completion"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500 ease-out",
                      pct === 100 ? "bg-emerald-500" : "bg-primary"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    ["available", "maybe", "unavailable", "pending"] as AvailabilityStatus[]
                  ).map((s) => (
                    <div key={s} className="rounded-lg border bg-muted/20 px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn("size-2 rounded-full", STATUS_CONFIG[s].dot)}
                        />
                        <span className="truncate text-[11px] text-muted-foreground">
                          <span className="sm:hidden">
                            {s === "available"
                              ? "Yes"
                              : s === "unavailable"
                                ? "No"
                                : s === "pending"
                                  ? "Left"
                                  : "Maybe"}
                          </span>
                          <span className="hidden sm:inline">
                            {STATUS_CONFIG[s].label}
                          </span>
                        </span>
                      </div>
                      <p className="mt-0.5 text-base font-bold">{counts[s]}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {counts.pending > 0 && (
              <Card>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                      <Zap className="size-4 text-primary" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Quick fill</p>
                      <p className="text-xs text-muted-foreground">
                        Answer {counts.pending} remaining session
                        {counts.pending !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-2 min-[400px]:grid-cols-3 lg:grid-cols-1">
                    {(["available", "maybe", "unavailable"] as AvailabilityStatus[]).map(
                      (s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant="outline"
                          className={cn(
                            "h-auto min-h-11 justify-center gap-1.5 py-2 text-xs lg:justify-start",
                            STATUS_CONFIG[s].btnTint
                          )}
                          onClick={() => handleBulkSet(s)}
                        >
                          {STATUS_CONFIG[s].icon}
                          <span className="lg:hidden">
                            {s === "available"
                              ? "All yes"
                              : s === "unavailable"
                                ? "All no"
                                : "All maybe"}
                          </span>
                          <span className="hidden lg:inline">
                            Mark all {STATUS_CONFIG[s].label.toLowerCase()}
                          </span>
                        </Button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {pct === 100 && sessions.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              <Check className="size-4 shrink-0" />
              <span>
                <strong>All set.</strong> You&apos;ve answered every session in this
                schedule.
              </span>
            </div>
          )}

          <Card className="gap-0 py-0">
            <CardContent className="flex flex-col items-stretch gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold tracking-tight sm:text-lg">
                    {viewMonthLabel}
                  </h2>
                  <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                    {schedule.name}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 text-xs sm:min-h-0"
                  onClick={goToToday}
                >
                  Today
                </Button>
                <div className="flex items-center rounded-lg border bg-background p-0.5 shadow-xs">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPrevMonth}
                    disabled={!hasPrevMonth}
                    aria-label="Previous month"
                    className="min-h-11 min-w-11 rounded-md sm:min-h-0 sm:min-w-0"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <div className="h-5 w-px bg-border" aria-hidden="true" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNextMonth}
                    disabled={!hasNextMonth}
                    aria-label="Next month"
                    className="min-h-11 min-w-11 rounded-md sm:min-h-0 sm:min-w-0"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ===== MOBILE: Session list ===== */}
          <div className="space-y-3 md:hidden">
            {filteredMobileSessions.length === 0 && (
              <div className="rounded-xl border border-dashed py-10 text-center">
                <CalendarDays className="mx-auto size-8 text-muted-foreground/60" />
                <p className="mt-2 text-sm font-medium">No sessions this month</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Use the arrows to browse another month.
                </p>
              </div>
            )}
            {filteredMobileSessions.map((session) => {
              const entry = myAvailMap.get(session.id);
              const status: AvailabilityStatus = entry?.status ?? "pending";
              const cfg = STATUS_CONFIG[status];
              const isExpanded = expandedMobileSession === session.id;
              const isToday = session.date === todayStr;
              const date = formatDateDisplay(session.date);

              return (
                <Card
                  key={session.id}
                  className={cn(
                    "gap-0 overflow-hidden py-0 transition-all",
                    isExpanded && "border-primary/40 shadow-md",
                    isToday && "ring-2 ring-primary/60"
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "w-full px-3 py-3 text-left outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
                      !isExpanded && cfg.cellBg
                    )}
                    aria-expanded={isExpanded}
                    aria-controls={`mobile-session-${session.id}`}
                    onClick={() =>
                      setExpandedMobileSession(isExpanded ? null : session.id)
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border bg-background/80",
                          isToday && "border-primary bg-primary text-primary-foreground"
                        )}
                      >
                        <span className="text-[10px] font-semibold uppercase leading-none">
                          {date.dayAbbr}
                        </span>
                        <span className="mt-0.5 text-lg font-bold leading-none">
                          {parseISODate(session.date).getUTCDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{date.monthDay}</p>
                          {isToday && (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="size-3.5 shrink-0" />
                          <span className="truncate">
                            {session.startTime} – {session.endTime}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" />
                          <span className="truncate">{session.location}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold [&>svg]:size-3",
                            cfg.badgeClass
                          )}
                        >
                          {cfg.icon}
                          <span className="hidden min-[380px]:inline">
                            {status === "pending" ? "Set status" : cfg.label}
                          </span>
                        </span>
                        <ChevronDown
                          className={cn(
                            "size-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      id={`mobile-session-${session.id}`}
                      className="space-y-4 border-t bg-muted/20 p-4"
                    >
                      <div>
                        <Label className="mb-2 block text-sm font-semibold">
                          Can you work this session?
                        </Label>
                        {renderStatusButtons(session, entry, true)}
                      </div>

                      {renderCustomTime(session, entry, "mobile")}

                      <Button
                        size="sm"
                        className="h-10 w-full text-sm"
                        onClick={() => setExpandedMobileSession(null)}
                      >
                        Done
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* ===== DESKTOP: Calendar grid ===== */}
          <Card className="hidden overflow-hidden md:block">
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b bg-muted/50">
                {DAY_NAMES.map((d) => (
                  <div
                    key={d}
                    className="py-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="divide-y">
                {weeks.length === 0 && (
                  <div className="py-14 text-center">
                    <CalendarDays className="mx-auto size-8 text-muted-foreground/60" />
                    <p className="mt-2 text-sm font-medium">No sessions this month</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Use the arrows to browse another month.
                    </p>
                  </div>
                )}
                {weeks.map((week, wi) => {
                  return (
                    <div key={wi}>
                      <div className="grid grid-cols-7">
                        {week.map(({ date, sessions: daySessions }, di) => {
                          const dayNum = parseISODate(date).getUTCDate();
                          const isToday = date === todayStr;

                          return (
                            <div
                              key={di}
                              className={cn(
                                "min-h-36 border-r p-2.5 align-top transition-colors last:border-r-0",
                                daySessions.length === 0 && "bg-muted/10",
                                daySessions.length > 0 && "hover:bg-muted/15",
                                isToday && "bg-primary/3 ring-2 ring-inset ring-primary/70"
                              )}
                            >
                              <div className="mb-2 flex items-start justify-between">
                                <span
                                  className={cn(
                                    "inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold",
                                    isToday
                                      ? "bg-primary text-primary-foreground"
                                      : daySessions.length === 0
                                        ? "text-muted-foreground"
                                        : "text-foreground"
                                  )}
                                >
                                  {dayNum}
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                {daySessions.map((session) => {
                                  const entry = myAvailMap.get(session.id);
                                  const status: AvailabilityStatus =
                                    entry?.status ?? "pending";
                                  const cfg = STATUS_CONFIG[status];

                                  return (
                                    <Popover
                                      key={session.id}
                                      open={openPopover === session.id}
                                      onOpenChange={(open) =>
                                        setOpenPopover(open ? session.id : null)
                                      }
                                    >
                                      <PopoverTrigger asChild>
                                        <button
                                          type="button"
                                          className={cn(
                                            "w-full rounded-lg border p-2 text-left shadow-xs outline-none transition-all",
                                            "hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring/50",
                                            cfg.cellBg || "bg-card"
                                          )}
                                        >
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-1 text-[11px] font-semibold leading-tight">
                                              <Clock className="size-3 shrink-0 text-muted-foreground" />
                                              <span>
                                                {session.startTime}&ndash;
                                                {session.endTime}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] leading-tight text-muted-foreground">
                                              <MapPin className="size-3 shrink-0" />
                                              <span className="truncate">
                                                {session.location}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="mt-2 flex items-center justify-between gap-1">
                                            <span
                                              className={cn(
                                                "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold",
                                                "[&>svg]:size-2.5",
                                                cfg.badgeClass
                                              )}
                                            >
                                              {cfg.icon}
                                              {status === "pending" ? "Set status" : cfg.label}
                                            </span>
                                            <ChevronRight className="size-3 text-muted-foreground/60" />
                                          </div>

                                          {entry?.customStartTime && (
                                            <div className="mt-1.5 truncate border-t pt-1.5 text-[9px] text-muted-foreground">
                                              Can work {entry.customStartTime}
                                              {entry.customEndTime &&
                                                `–${entry.customEndTime}`}
                                            </div>
                                          )}
                                        </button>
                                      </PopoverTrigger>

                                      <PopoverContent
                                        className="w-80 overflow-hidden p-0"
                                        side="bottom"
                                        align="center"
                                        collisionPadding={16}
                                        avoidCollisions
                                      >
                                        <div>
                                          <div className={cn("border-b p-4", cfg.cellBg)}>
                                            <div className="flex items-start justify-between gap-3">
                                              <div>
                                                <div className="font-semibold">
                                                  {formatFullDate(session.date)}
                                                </div>
                                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                  <span className="flex items-center gap-1">
                                                    <Clock className="size-3" />
                                                    {session.startTime} – {session.endTime}
                                                  </span>
                                                  <span className="flex items-center gap-1">
                                                    <MapPin className="size-3" />
                                                    {session.location}
                                                  </span>
                                                </div>
                                              </div>
                                              <span
                                                className={cn(
                                                  "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold",
                                                  "[&>svg]:size-3",
                                                  cfg.badgeClass
                                                )}
                                              >
                                                {cfg.icon}
                                                {cfg.label}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="space-y-4 p-4">
                                            <div className="space-y-2">
                                              <Label className="text-xs font-semibold">
                                                Can you work this session?
                                              </Label>
                                              {renderStatusButtons(session, entry)}
                                            </div>

                                            {renderCustomTime(session, entry, "desktop")}
                                            {entry?.status === "available" && (
                                              <Button
                                                size="sm"
                                                className="h-8 w-full text-xs"
                                                onClick={() => setOpenPopover(null)}
                                              >
                                                Done
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="hidden flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-4 text-xs text-muted-foreground md:flex">
            {(
              ["available", "maybe", "unavailable", "pending"] as AvailabilityStatus[]
            ).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-full", STATUS_CONFIG[s].dot)} />
                <span>
                  <strong className="font-medium text-foreground">
                    {STATUS_CONFIG[s].label}
                  </strong>{" "}
                  · {STATUS_CONFIG[s].description}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted">
              <CalendarDays className="size-5 text-muted-foreground" />
            </span>
            <h2 className="mt-4 text-base font-semibold">No active schedules</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              There aren&apos;t any sessions to respond to yet. Check back when your
              administrator publishes a schedule.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

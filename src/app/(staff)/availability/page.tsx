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
  CheckCircle2,
  Clock,
  MapPin,
  XCircle,
  HelpCircle,
  Zap,
  Info,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
} from "lucide-react";
import type { AvailabilityStatus, Session } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  addDays,
  formatDateDisplay,
  formatISODate,
  monthYear,
  parseISODate,
  todayISO,
} from "@/lib/dates";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_CONFIG: Record<
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
> = {
  available: {
    label: "Available",
    description: "I can work this session",
    icon: <CheckCircle2 className="h-4 w-4" />,
    btnClass: "border-green-500 bg-green-100 text-green-800 hover:bg-green-200 shadow-sm",
    btnTint: "border-green-200 bg-green-50/60 text-green-700 hover:bg-green-100",
    cellBg: "bg-green-50 dark:bg-green-950/30",
    dot: "bg-green-500",
    badgeClass: "bg-green-200 text-green-900 border-green-400",
  },
  unavailable: {
    label: "Unavailable",
    description: "I cannot work this session",
    icon: <XCircle className="h-4 w-4" />,
    btnClass: "border-red-500 bg-red-100 text-red-800 hover:bg-red-200 shadow-sm",
    btnTint: "border-red-200 bg-red-50/60 text-red-700 hover:bg-red-100",
    cellBg: "bg-red-50 dark:bg-red-950/30",
    dot: "bg-red-500",
    badgeClass: "bg-red-200 text-red-900 border-red-400",
  },
  maybe: {
    label: "Maybe",
    description: "I might be able to work",
    icon: <HelpCircle className="h-4 w-4" />,
    btnClass: "border-yellow-500 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 shadow-sm",
    btnTint: "border-yellow-200 bg-yellow-50/60 text-yellow-700 hover:bg-yellow-100",
    cellBg: "bg-amber-50 dark:bg-yellow-950/30",
    dot: "bg-yellow-500",
    badgeClass: "bg-yellow-200 text-yellow-900 border-yellow-400",
  },
  pending: {
    label: "Not Set",
    description: "You haven't responded yet",
    icon: <Clock className="h-4 w-4" />,
    btnClass: "border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100",
    btnTint: "border-gray-200 bg-gray-50/60 text-gray-500 hover:bg-gray-100",
    cellBg: "",
    dot: "bg-gray-300",
    badgeClass: "bg-gray-200 text-gray-600 border-gray-400",
  },
};

type WeekRow = { date: string; sessions: Session[] }[];

function buildCalendarWeeks(sessions: Session[]): WeekRow[] {
  if (sessions.length === 0) return [];

  const byDate = new Map<string, Session[]>();
  for (const s of sessions) {
    const existing = byDate.get(s.date);
    if (existing) existing.push(s);
    else byDate.set(s.date, [s]);
  }
  for (const daySessions of byDate.values()) {
    daySessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const sorted = sessions.map((s) => s.date).sort();
  const first = parseISODate(sorted[0]);
  const last = parseISODate(sorted[sorted.length - 1]);

  const start = addDays(first, -first.getUTCDay());
  const end = addDays(last, 6 - last.getUTCDay());

  const weeks: WeekRow[] = [];
  let cur = start;
  while (cur.getTime() <= end.getTime()) {
    const week: WeekRow = [];
    for (let d = 0; d < 7; d++) {
      const ds = formatISODate(cur);
      week.push({ date: ds, sessions: byDate.get(ds) ?? [] });
      cur = addDays(cur, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function formatFullDate(dateStr: string) {
  return formatDateDisplay(dateStr).fullLong;
}

function formatShortDate(dateStr: string) {
  return formatDateDisplay(dateStr).shortLong;
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
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
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
            key={s}
            onClick={() => {
              handleStatusChange(session.id, s);
              if (s !== "available") {
                setOpenPopover(null);
                setExpandedMobileSession(null);
              }
            }}
            className={cn(
              "flex flex-col items-center rounded-lg border-2 font-medium transition-all",
              mobile ? "gap-1.5 px-3 py-3.5 text-sm" : "gap-1 px-2 py-2.5 text-xs",
              entry?.status === s
                ? STATUS_CONFIG[s].btnClass
                : STATUS_CONFIG[s].btnTint
            )}
          >
            {mobile
              ? <span className="[&>svg]:h-5 [&>svg]:w-5">{STATUS_CONFIG[s].icon}</span>
              : STATUS_CONFIG[s].icon}
            {STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>
    );
  }

  function renderCustomTime(session: Session, entry: ReturnType<typeof myAvailMap.get>) {
    if (entry?.status !== "available") return null;
    return (
      <div className="space-y-1.5 mt-2">
        <Label className="text-xs font-medium text-muted-foreground">
          Available for a different time? (optional)
        </Label>
        <div className="flex items-center gap-2">
          <Input
            className="h-8 text-xs"
            placeholder="e.g. 5:00 PM"
            value={entry.customStartTime || ""}
            onChange={(e) =>
              handleCustomTimeChange(session.id, "customStartTime", e.target.value)
            }
          />
          <span className="text-muted-foreground text-xs shrink-0">to</span>
          <Input
            className="h-8 text-xs"
            placeholder="e.g. 8:00 PM"
            value={entry.customEndTime || ""}
            onChange={(e) =>
              handleCustomTimeChange(session.id, "customEndTime", e.target.value)
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            My Availability
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hi {currentStaff.firstName} -- let your admin know when you can work.
          </p>
        </div>

        {schedules.length > 1 && (
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Pick Schedule</Label>
            <Select value={activeScheduleId} onValueChange={setSelectedSchedule}>
              <SelectTrigger className="w-full sm:w-64">
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

      {schedule && (
        <>
          {/* How it works banner */}
          {counts.pending > 0 && counts.pending === sessions.length && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="py-3 sm:py-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">How to set your availability</p>
                    <ol className="text-xs text-blue-800/80 space-y-0.5 list-decimal list-inside">
                      <li>Tap any session below to set your status</li>
                      <li>Choose <strong>Available</strong>, <strong>Maybe</strong>, or <strong>Unavailable</strong></li>
                      <li>Use <strong>Quick Actions</strong> to set all days at once</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <Card>
            <CardContent className="py-3 sm:py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {responded} of {sessions.length} sessions
                </span>
                <span className="text-sm font-semibold text-primary">
                  {pct}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm">
                {(
                  ["available", "unavailable", "maybe", "pending"] as AvailabilityStatus[]
                ).map((s) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", STATUS_CONFIG[s].dot)} />
                    <span className="text-muted-foreground">
                      {counts[s]} {STATUS_CONFIG[s].label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {counts.pending > 0 && (
            <Card>
              <CardContent className="py-3 sm:py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Quick Actions</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Set all {counts.pending} remaining session{counts.pending !== 1 ? "s" : ""} at once:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["available", "unavailable", "maybe"] as AvailabilityStatus[]).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 h-9"
                      onClick={() => handleBulkSet(s)}
                    >
                      {STATUS_CONFIG[s].icon}
                      <span className="hidden sm:inline">Mark All</span> {STATUS_CONFIG[s].label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={goToPrevMonth}
                disabled={!hasPrevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs hidden sm:inline-flex"
                onClick={goToToday}
              >
                Today
              </Button>
            </div>
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                {viewMonthLabel}
              </h2>
              <p className="text-xs text-muted-foreground">{schedule.name}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={goToNextMonth}
              disabled={!hasNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* ===== MOBILE: Session list ===== */}
          <div className="md:hidden space-y-3">
            {filteredMobileSessions.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No sessions this month.
              </p>
            )}
            {filteredMobileSessions.map((session) => {
                const entry = myAvailMap.get(session.id);
                const status: AvailabilityStatus = entry?.status ?? "pending";
                const cfg = STATUS_CONFIG[status];
                const isExpanded = expandedMobileSession === session.id;
                const isToday = session.date === todayStr;

                return (
                  <div key={session.id}>
                    <Card
                      className={cn(
                        "overflow-hidden transition-all",
                        cfg.cellBg,
                        isToday && "ring-2 ring-primary",
                        status === "pending" && !isExpanded && "border-dashed border-muted-foreground/30"
                      )}
                    >
                      <button
                        className="w-full text-left px-4 py-3.5 active:bg-accent/50 transition-colors"
                        onClick={() => setExpandedMobileSession(isExpanded ? null : session.id)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base font-bold">
                                {formatShortDate(session.date)}
                              </span>
                              {isToday && (
                                <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-semibold">
                                  Today
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                {session.startTime} – {session.endTime}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{session.location}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border",
                              cfg.badgeClass
                            )}>
                              {cfg.icon}
                              {status === "pending" ? "Tap to set" : cfg.label}
                            </span>
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-3 border-t space-y-4 bg-muted/30">
                          <div>
                            <Label className="text-sm font-medium block mb-2">
                              Can you work this session?
                            </Label>
                            {renderStatusButtons(session, entry, true)}
                          </div>

                          {entry?.status && entry.status !== "pending" && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className={cn("h-2.5 w-2.5 rounded-full", cfg.dot)} />
                              <span className="text-muted-foreground">
                                You selected: <strong>{cfg.label}</strong>
                              </span>
                            </div>
                          )}

                          {renderCustomTime(session, entry)}

                          <Button
                            size="sm"
                            className="w-full h-10 text-sm"
                            onClick={() => setExpandedMobileSession(null)}
                          >
                            Done
                          </Button>
                        </div>
                      )}
                    </Card>
                  </div>
                );
            })}
          </div>

          {/* ===== DESKTOP: Calendar grid ===== */}
          <Card className="overflow-hidden hidden md:block">
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b bg-muted/40">
                {DAY_NAMES.map((d) => (
                  <div
                    key={d}
                    className="py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="divide-y">
                {weeks.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-12">
                    No sessions this month.
                  </p>
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
                                "min-h-[120px] border-r last:border-r-0 p-2 align-top",
                                daySessions.length === 0 && "bg-muted/10 opacity-40",
                                isToday && "ring-2 ring-inset ring-primary"
                              )}
                            >
                              <div className="flex items-start justify-between mb-1.5">
                                <span
                                  className={cn(
                                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
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
                                          className={cn(
                                            "w-full rounded-md border p-1.5 text-left transition-all",
                                            "hover:ring-2 hover:ring-inset hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                                            cfg.cellBg || "bg-background"
                                          )}
                                        >
                                          <div className="space-y-0.5">
                                            <div className="text-[11px] leading-tight font-medium text-muted-foreground flex items-center gap-1">
                                              <Clock className="h-3 w-3 shrink-0" />
                                              <span>
                                                {session.startTime}&ndash;
                                                {session.endTime}
                                              </span>
                                            </div>
                                            <div className="text-[11px] leading-tight text-muted-foreground flex items-center gap-1">
                                              <MapPin className="h-3 w-3 shrink-0" />
                                              <span className="truncate">
                                                {session.location}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="mt-1.5">
                                            <span className={cn(
                                              "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                                              cfg.badgeClass
                                            )}>
                                              {cfg.icon}
                                              {status === "pending" ? "Tap to set" : cfg.label}
                                            </span>
                                          </div>

                                          {entry?.customStartTime && (
                                            <div className="mt-1 text-[10px] text-muted-foreground/70 italic truncate">
                                              Custom: {entry.customStartTime}
                                              {entry.customEndTime && `–${entry.customEndTime}`}
                                            </div>
                                          )}
                                        </button>
                                      </PopoverTrigger>

                                      <PopoverContent
                                        className="w-72"
                                        side="bottom"
                                        align="center"
                                        collisionPadding={16}
                                        avoidCollisions
                                      >
                                        <div className="space-y-3">
                                          <div>
                                            <div className="font-semibold">
                                              {formatFullDate(session.date)}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                                              <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {session.startTime} - {session.endTime}
                                              </span>
                                              <span className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {session.location}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">
                                              Can you work this session?
                                            </Label>
                                            {renderStatusButtons(session, entry)}
                                          </div>

                                          {renderCustomTime(session, entry)}
                                          {entry?.status === "available" && (
                                            <Button
                                              size="sm"
                                              className="w-full h-7 text-xs mt-1"
                                              onClick={() => setOpenPopover(null)}
                                            >
                                              Done
                                            </Button>
                                          )}
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

          {/* Legend - desktop only */}
          <div className="hidden md:flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground pb-4">
            {(["available", "unavailable", "maybe", "pending"] as AvailabilityStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={cn("h-3 w-3 rounded-full", STATUS_CONFIG[s].dot)} />
                <span>{STATUS_CONFIG[s].label} -- {STATUS_CONFIG[s].description}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

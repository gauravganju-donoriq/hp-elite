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
  CalendarDays,
  Zap,
} from "lucide-react";
import type { AvailabilityStatus, Session } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_CONFIG: Record<
  AvailabilityStatus,
  {
    label: string;
    icon: React.ReactNode;
    btnClass: string;
    cellBg: string;
    dot: string;
  }
> = {
  available: {
    label: "Available",
    icon: <CheckCircle2 className="h-4 w-4" />,
    btnClass: "border-green-400 bg-green-50 text-green-700 hover:bg-green-100",
    cellBg: "bg-green-50/80 dark:bg-green-950/20",
    dot: "bg-green-500",
  },
  unavailable: {
    label: "Unavailable",
    icon: <XCircle className="h-4 w-4" />,
    btnClass: "border-red-400 bg-red-50 text-red-700 hover:bg-red-100",
    cellBg: "bg-red-50/80 dark:bg-red-950/20",
    dot: "bg-red-500",
  },
  maybe: {
    label: "Maybe",
    icon: <HelpCircle className="h-4 w-4" />,
    btnClass:
      "border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100",
    cellBg: "bg-amber-50/80 dark:bg-yellow-950/20",
    dot: "bg-yellow-500",
  },
  pending: {
    label: "Not Set",
    icon: <Clock className="h-4 w-4" />,
    btnClass: "border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100",
    cellBg: "",
    dot: "bg-gray-300",
  },
};

type WeekRow = { date: string; session: Session | null }[];

function buildCalendarWeeks(sessions: Session[]): WeekRow[] {
  if (sessions.length === 0) return [];

  const byDate = new Map<string, Session>();
  for (const s of sessions) byDate.set(s.date, s);

  const sorted = sessions.map((s) => s.date).sort();
  const first = new Date(sorted[0] + "T12:00:00");
  const last = new Date(sorted[sorted.length - 1] + "T12:00:00");

  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());

  const end = new Date(last);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const weeks: WeekRow[] = [];
  const cur = new Date(start);

  while (cur <= end) {
    const week: WeekRow = [];
    for (let d = 0; d < 7; d++) {
      const ds = cur.toISOString().split("T")[0];
      week.push({ date: ds, session: byDate.get(ds) ?? null });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function monthLabel(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
  });
}

export default function AvailabilityPage() {
  const router = useRouter();
  const { identity } = useStaffIdentity();
  const { staff, schedules, availability, setAvailability } = useScheduling();
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  useEffect(() => {
    if (!identity) router.replace("/");
  }, [identity, router]);

  useEffect(() => {
    if (schedules.length > 0 && !selectedSchedule) {
      setSelectedSchedule(schedules[0].id);
    }
  }, [schedules, selectedSchedule]);

  if (!identity) return null;

  const currentStaff = staff.find((s) => s.id === identity.staffId);
  if (!currentStaff) return null;

  const schedule = schedules.find((s) => s.id === selectedSchedule);
  const sessions = schedule
    ? [...schedule.sessions].sort((a, b) => a.date.localeCompare(b.date))
    : [];

  const weeks = buildCalendarWeeks(sessions);

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
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            My Availability
          </h1>
          <p className="text-muted-foreground mt-1">
            Tap any day to set your availability for that session.
          </p>
        </div>

        {schedules.length > 1 && (
          <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
            <SelectTrigger className="w-64">
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
        )}
      </div>

      {schedule && (
        <>
          {/* Stats + Quick Actions */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="py-4">
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
                <div className="flex items-center gap-4 mt-3 text-sm">
                  {(
                    [
                      "available",
                      "unavailable",
                      "maybe",
                      "pending",
                    ] as AvailabilityStatus[]
                  ).map((s) => (
                    <div key={s} className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          STATUS_CONFIG[s].dot
                        )}
                      />
                      <span className="text-muted-foreground tabular-nums">
                        {counts[s]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {counts.pending > 0 && (
              <Card>
                <CardContent className="py-4 flex flex-col justify-center h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Quick Actions</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Set all {counts.pending} remaining sessions at once:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      ["available", "unavailable", "maybe"] as AvailabilityStatus[]
                    ).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5"
                        onClick={() => handleBulkSet(s)}
                      >
                        {STATUS_CONFIG[s].icon}
                        All {STATUS_CONFIG[s].label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Schedule title */}
          <div className="text-center">
            <h2 className="text-lg font-semibold">{schedule.name}</h2>
            {schedule.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {schedule.description}
              </p>
            )}
          </div>

          {/* Calendar */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Day-of-week header */}
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

              {/* Week rows */}
              <div className="divide-y">
                {weeks.map((week, wi) => {
                  const showMonth =
                    wi === 0 ||
                    monthLabel(week[0].date) !==
                      monthLabel(weeks[wi - 1][0].date);

                  return (
                    <div key={wi}>
                      {showMonth && (
                        <div className="px-3 py-1.5 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                          {new Date(
                            week[0].date + "T12:00:00"
                          ).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                      )}
                      <div className="grid grid-cols-7">
                        {week.map(({ date, session }, di) => {
                          const dayNum = new Date(
                            date + "T12:00:00"
                          ).getDate();
                          const isToday = date === todayStr;

                          if (!session) {
                            return (
                              <div
                                key={di}
                                className="min-h-[110px] border-r last:border-r-0 bg-muted/10 p-2 opacity-40"
                              >
                                <span className="text-xs text-muted-foreground">
                                  {dayNum}
                                </span>
                              </div>
                            );
                          }

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
                                    "min-h-[110px] border-r last:border-r-0 p-2 text-left transition-all relative group",
                                    "hover:ring-2 hover:ring-inset hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                                    cfg.cellBg,
                                    isToday && "ring-2 ring-inset ring-primary"
                                  )}
                                >
                                  {/* Day number + status icon */}
                                  <div className="flex items-start justify-between">
                                    <span
                                      className={cn(
                                        "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                                        isToday
                                          ? "bg-primary text-primary-foreground"
                                          : "text-foreground"
                                      )}
                                    >
                                      {dayNum}
                                    </span>
                                    {status !== "pending" && (
                                      <span className="mt-0.5 opacity-80">
                                        {cfg.icon}
                                      </span>
                                    )}
                                  </div>

                                  {/* Session info */}
                                  <div className="mt-1.5 space-y-0.5">
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

                                  {entry?.customStartTime && (
                                    <div className="mt-1 text-[10px] text-muted-foreground/70 italic truncate">
                                      Custom: {entry.customStartTime}
                                      {entry.customEndTime &&
                                        `–${entry.customEndTime}`}
                                    </div>
                                  )}

                                  {/* Hover hint for pending */}
                                  {status === "pending" && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/60 rounded">
                                      <span className="text-xs font-medium text-primary">
                                        Set status
                                      </span>
                                    </div>
                                  )}
                                </button>
                              </PopoverTrigger>

                              <PopoverContent
                                className="w-72"
                                side="bottom"
                                align="center"
                              >
                                <div className="space-y-3">
                                  {/* Date header */}
                                  <div>
                                    <div className="font-semibold">
                                      {new Date(
                                        session.date + "T12:00:00"
                                      ).toLocaleDateString("en-US", {
                                        weekday: "long",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {session.startTime} -{" "}
                                        {session.endTime}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {session.location}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Status buttons */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                      Your availability
                                    </Label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                      {(
                                        [
                                          "available",
                                          "unavailable",
                                          "maybe",
                                        ] as AvailabilityStatus[]
                                      ).map((s) => (
                                        <button
                                          key={s}
                                          onClick={() =>
                                            handleStatusChange(session.id, s)
                                          }
                                          className={cn(
                                            "flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2.5 text-xs font-medium transition-all",
                                            entry?.status === s
                                              ? STATUS_CONFIG[s].btnClass
                                              : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                                          )}
                                        >
                                          {STATUS_CONFIG[s].icon}
                                          {STATUS_CONFIG[s].label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Custom time */}
                                  {entry?.status === "available" && (
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-medium text-muted-foreground">
                                        Custom time (optional)
                                      </Label>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          className="h-8 text-xs"
                                          placeholder="From"
                                          value={
                                            entry.customStartTime || ""
                                          }
                                          onChange={(e) =>
                                            handleCustomTimeChange(
                                              session.id,
                                              "customStartTime",
                                              e.target.value
                                            )
                                          }
                                        />
                                        <span className="text-muted-foreground text-xs shrink-0">
                                          &ndash;
                                        </span>
                                        <Input
                                          className="h-8 text-xs"
                                          placeholder="To"
                                          value={
                                            entry.customEndTime || ""
                                          }
                                          onChange={(e) =>
                                            handleCustomTimeChange(
                                              session.id,
                                              "customEndTime",
                                              e.target.value
                                            )
                                          }
                                        />
                                      </div>
                                    </div>
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
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground pb-4">
            {(
              ["available", "unavailable", "maybe", "pending"] as AvailabilityStatus[]
            ).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-3 w-3 rounded-full",
                    STATUS_CONFIG[s].dot
                  )}
                />
                <span>{STATUS_CONFIG[s].label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

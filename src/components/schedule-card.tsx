"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CalendarRange,
  CheckCircle2,
  MapPin,
  TriangleAlert,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useScheduling } from "@/lib/context";
import { parseISODate, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Schedule } from "@/lib/types";

type ScheduleStatus = "active" | "upcoming" | "past";

function formatDate(dateStr: string, includeYear = false) {
  return parseISODate(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: includeYear ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

function getScheduleStatus(schedule: Schedule): ScheduleStatus {
  const today = todayISO();
  if (today < schedule.startDate) return "upcoming";
  if (today > schedule.endDate) return "past";
  return "active";
}

function getDateRange(schedule: Schedule) {
  const startYear = parseISODate(schedule.startDate).getUTCFullYear();
  const endYear = parseISODate(schedule.endDate).getUTCFullYear();
  const includeStartYear = startYear !== endYear;
  return `${formatDate(schedule.startDate, includeStartYear)} – ${formatDate(
    schedule.endDate,
    true
  )}`;
}

const STATUS_STYLES: Record<
  ScheduleStatus,
  { label: string; badge: string; accent: string }
> = {
  active: {
    label: "Active now",
    badge:
      "border-primary/25 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/15",
    accent: "bg-primary",
  },
  upcoming: {
    label: "Upcoming",
    badge:
      "border-brand-accent/30 bg-brand-accent/10 text-brand-accent-foreground dark:text-brand-accent",
    accent: "bg-brand-accent",
  },
  past: {
    label: "Completed",
    badge: "border-border bg-muted text-muted-foreground",
    accent: "bg-muted-foreground/35",
  },
};

function coverageTone(pct: number) {
  if (pct >= 80)
    return {
      text: "text-emerald-600 dark:text-emerald-400",
      bar: "bg-emerald-500",
    };
  if (pct >= 20)
    return {
      text: "text-amber-600 dark:text-amber-400",
      bar: "bg-amber-500",
    };
  return {
    text: "text-red-600 dark:text-red-400",
    bar: "bg-red-500",
  };
}

export function ScheduleCard({ schedule }: { schedule: Schedule }) {
  const { sessionSlots } = useScheduling();

  const totalSessions = schedule.sessions.length;
  const totalRequired = schedule.sessions.reduce(
    (total, session) => total + session.requiredStaff,
    0
  );
  const sessionIds = new Set(schedule.sessions.map((session) => session.id));
  const assignedSlots = sessionSlots.filter(
    (slot) => sessionIds.has(slot.sessionId) && slot.assignedStaffId
  ).length;
  const unfilledSlots = Math.max(totalRequired - assignedSlots, 0);
  const coveragePct =
    totalRequired > 0 ? Math.min(Math.round((assignedSlots / totalRequired) * 100), 100) : 0;
  const fullyStaffed = totalRequired > 0 && unfilledSlots === 0;
  const tone = coverageTone(coveragePct);
  const locations = [...new Set(schedule.sessions.map((s) => s.location))];
  const status = getScheduleStatus(schedule);
  const statusStyle = STATUS_STYLES[status];

  return (
    <Link
      href={`/admin/schedules/${schedule.id}`}
      className="group block rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Card
        className={cn(
          "relative h-full gap-0 overflow-hidden p-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/25 group-hover:shadow-md",
          status === "past" && "bg-card/70"
        )}
      >
        <span className={cn("absolute inset-x-0 top-0 h-1", statusStyle.accent)} />
        <div className="flex h-full flex-col p-4 pt-5 sm:p-5 sm:pt-6">
          <div className="flex items-start justify-between gap-3">
            <Badge
              variant="outline"
              className={cn("rounded-full px-2.5 py-1 text-[11px]", statusStyle.badge)}
            >
              {statusStyle.label}
            </Badge>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground">
              <ArrowUpRight className="size-4" />
            </span>
          </div>

          <div className="mt-3 min-h-12 sm:mt-4 sm:min-h-14">
            <h3 className="line-clamp-2 text-base leading-snug font-semibold tracking-tight transition-colors group-hover:text-primary sm:text-lg">
              {schedule.name}
            </h3>
            {schedule.description && (
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                {schedule.description}
              </p>
            )}
          </div>

          <div className="mt-3 divide-y overflow-hidden rounded-lg bg-muted/55 sm:mt-4">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-primary shadow-sm">
                <CalendarRange className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Schedule dates
                </p>
                <p className="truncate text-sm font-medium">
                  {getDateRange(schedule)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-3 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-primary shadow-sm">
                <MapPin className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {locations.length === 1 ? "Location" : "Locations"}
                </p>
                <p className="line-clamp-2 text-sm font-medium">
                  {locations.length > 0 ? locations.join(" · ") : "Not set"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Assignment coverage
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">
                  {assignedSlots} of {totalRequired} spots
                </p>
              </div>
              <span className={cn("text-lg font-bold tabular-nums", tone.text)}>
                {coveragePct}%
              </span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", tone.bar)}
                style={{ width: `${Math.min(coveragePct, 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 border-t pt-3 text-sm sm:mt-5 sm:pt-4">
            {totalSessions === 0 ? (
              <span className="text-muted-foreground">Add sessions to get started</span>
            ) : fullyStaffed ? (
              <>
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium text-emerald-700 dark:text-emerald-300">
                  All assignments filled
                </span>
              </>
            ) : (
              <>
                <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  {unfilledSlots} assignment{unfilledSlots === 1 ? "" : "s"} still open
                </span>
              </>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

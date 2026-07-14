"use client";

import Link from "next/link";
import {
  CalendarCheck2,
  CalendarClock,
  CalendarRange,
  CircleAlert,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScheduleCard } from "@/components/schedule-card";
import { PageHeader } from "@/components/page-header";
import { EmptyState, LoadingState } from "@/components/states";
import { useScheduling } from "@/lib/context";
import { todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Schedule } from "@/lib/types";

export default function AdminDashboardPage() {
  const { schedules, sessionSlots, loading } = useScheduling();

  if (loading) {
    return <LoadingState label="Loading schedules..." />;
  }

  const today = todayISO();
  const activeSchedules = schedules
    .filter((schedule) => today >= schedule.startDate && today <= schedule.endDate)
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
  const upcomingSchedules = schedules
    .filter((schedule) => today < schedule.startDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const pastSchedules = schedules
    .filter((schedule) => today > schedule.endDate)
    .sort((a, b) => b.endDate.localeCompare(a.endDate));

  const currentSessionIds = new Set(
    [...activeSchedules, ...upcomingSchedules].flatMap((schedule) =>
      schedule.sessions.map((session) => session.id)
    )
  );
  const requiredAssignments = [...activeSchedules, ...upcomingSchedules].reduce(
    (total, schedule) =>
      total +
      schedule.sessions.reduce(
        (sessionTotal, session) => sessionTotal + session.requiredStaff,
        0
      ),
    0
  );
  const filledAssignments = sessionSlots.filter(
    (slot) => currentSessionIds.has(slot.sessionId) && slot.assignedStaffId
  ).length;
  const openAssignments = Math.max(requiredAssignments - filledAssignments, 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Schedules"
        description="Plan sessions, collect availability, and keep every shift covered."
        actions={
          <Button asChild>
            <Link href="/admin/schedules/create">
              <Plus className="size-4" />
              New Schedule
            </Link>
          </Button>
        }
      />

      {schedules.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No schedules yet"
          description="Create your first schedule to start collecting availability and assigning staff."
          action={
            <Button asChild>
              <Link href="/admin/schedules/create">
                <Plus className="size-4" />
                New Schedule
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid overflow-hidden rounded-xl border bg-card shadow-sm sm:grid-cols-3 sm:divide-x">
            <OverviewStat
              icon={CalendarCheck2}
              label="Active schedules"
              value={activeSchedules.length}
              detail="Currently in progress"
              tone="brand"
            />
            <OverviewStat
              icon={CalendarClock}
              label="Upcoming"
              value={upcomingSchedules.length}
              detail={
                upcomingSchedules.length > 0
                  ? "Scheduled for later"
                  : "Nothing scheduled"
              }
            />
            <OverviewStat
              icon={CircleAlert}
              label="Open assignments"
              value={openAssignments}
              detail={
                openAssignments > 0
                  ? "Across active and upcoming"
                  : "Everything is covered"
              }
              tone={openAssignments > 0 ? "warning" : "success"}
            />
          </div>

          <div className="space-y-6 sm:space-y-8">
            <ScheduleSection
              title="Active"
              description="Schedules currently in progress"
              icon={CalendarCheck2}
              schedules={activeSchedules}
            />
            <ScheduleSection
              title="Upcoming"
              description="What’s next on the calendar"
              icon={CalendarClock}
              schedules={upcomingSchedules}
            />
            <ScheduleSection
              title="Past"
              description="Completed schedule history"
              icon={CalendarRange}
              schedules={pastSchedules}
              muted
            />
          </div>
        </>
      )}
    </div>
  );
}

function ScheduleSection({
  title,
  description,
  icon: Icon,
  schedules,
  muted = false,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  schedules: Schedule[];
  muted?: boolean;
}) {
  if (schedules.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-3 sm:mb-4">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            muted
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold tracking-tight">{title}</h2>
            <Badge variant="secondary" className="rounded-full tabular-nums">
              {schedules.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="hidden h-px flex-1 bg-border sm:block" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {schedules.map((schedule) => (
          <ScheduleCard key={schedule.id} schedule={schedule} />
        ))}
      </div>
    </section>
  );
}

function OverviewStat({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  detail: string;
  tone?: "default" | "brand" | "warning" | "success";
}) {
  return (
    <div className="flex items-center gap-2.5 border-b p-3 last:border-b-0 sm:gap-3 sm:border-b-0 sm:p-5">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-10",
          tone === "brand" && "bg-primary/10 text-primary",
          tone === "warning" &&
            "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          tone === "success" &&
            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          tone === "default" && "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-4 sm:size-5" />
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold tabular-nums sm:text-2xl">{value}</span>
          <span className="truncate text-xs font-medium sm:text-sm">{label}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

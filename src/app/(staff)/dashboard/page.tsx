"use client";

import { useStaffIdentity } from "@/lib/staff-context";
import { useScheduling } from "@/lib/context";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { LoadingState } from "@/components/states";
import { AVAILABILITY_STATUS } from "@/lib/availability-status";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  AlertCircle,
  LayoutGrid,
} from "lucide-react";
import type { AvailabilityStatus } from "@/lib/types";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function StatusChip({ status }: { status: AvailabilityStatus }) {
  const config = AVAILABILITY_STATUS[status];
  const Icon = config.Icon;
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium">
      <Icon className={cn("size-4", config.solid)} />
      <span className="capitalize">{config.label}</span>
    </span>
  );
}

export default function StaffDashboardPage() {
  const { identity, userName, loading: identityLoading } = useStaffIdentity();
  const {
    staff,
    schedules,
    availability,
    sessionSlots,
    loading: dataLoading,
  } = useScheduling();

  if (identityLoading || dataLoading) {
    return <LoadingState label="Loading your dashboard..." />;
  }

  const currentStaff = identity
    ? staff.find((s) => s.id === identity.staffId)
    : null;

  const displayName = currentStaff?.firstName || userName || "there";

  const myAvailability = identity
    ? availability.filter((a) => a.staffId === identity.staffId)
    : [];
  const myAvailMap = new Map(myAvailability.map((a) => [a.sessionId, a]));

  const allSessions = schedules.flatMap((s) => s.sessions);
  const today = new Date().toISOString().split("T")[0];
  const upcomingSessions = allSessions
    .filter((s) => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10);

  const sessionById = new Map(allSessions.map((s) => [s.id, s]));
  const mySchedule = identity
    ? sessionSlots
        .filter(
          (sl) =>
            sl.assignedStaffId === identity.staffId &&
            sessionById.has(sl.sessionId)
        )
        .map((sl) => ({ slot: sl, session: sessionById.get(sl.sessionId)! }))
        .filter(({ session }) => session.date >= today)
        .sort(
          (a, b) =>
            a.session.date.localeCompare(b.session.date) ||
            a.session.startTime.localeCompare(b.session.startTime)
        )
        .slice(0, 10)
    : [];

  const totalSessions = allSessions.length;
  const respondedCount = myAvailability.length;
  const confirmedCount = myAvailability.filter(
    (a) => a.status === "available"
  ).length;
  const pendingCount = totalSessions - respondedCount;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          Welcome, {displayName}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Here&apos;s your scheduling overview.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Available"
          value={confirmedCount}
          hint="Sessions you can work"
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Responded"
          value={respondedCount}
          sub={`/ ${totalSessions}`}
          hint="Responses submitted"
          icon={MessageSquare}
          tone="brand"
        />
        <StatCard
          label="Awaiting"
          value={pendingCount}
          hint="Still need your input"
          icon={AlertCircle}
          tone={pendingCount > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Schedules"
          value={schedules.length}
          hint="Active schedules"
          icon={LayoutGrid}
        />
      </div>

      {identity && pendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3 sm:items-center">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                <CalendarCheck className="size-5 text-amber-600 dark:text-amber-400" />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {pendingCount} session{pendingCount !== 1 ? "s" : ""} need your
                  response.
                </p>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Submit your availability so the team can plan ahead.
                </p>
              </div>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/availability">
                Update availability
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {identity && (
        <Card>
          <CardHeader>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-1.5 text-base sm:text-lg">
                  <CalendarDays className="size-4 text-primary" />
                  My Schedule
                </CardTitle>
                <CardDescription>
                  Sessions you&apos;re scheduled to work.
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link href="/schedule">Full schedule</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {mySchedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You&apos;re not scheduled for any upcoming sessions yet.
              </p>
            ) : (
              <div className="space-y-2">
                {mySchedule.map(({ slot, session }) => {
                  const adjusted = Boolean(
                    slot.assignedStartTime || slot.assignedEndTime
                  );
                  const start = slot.assignedStartTime || session.startTime;
                  const end = slot.assignedEndTime || session.endTime;
                  return (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 sm:px-4"
                    >
                      <div className="min-w-0 text-sm">
                        <div className="text-sm font-medium">
                          {formatDate(session.date)}
                        </div>
                        <div className="mt-0.5 flex flex-col gap-0.5 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:gap-3 sm:text-xs">
                          <span
                            className={cn(
                              "flex items-center gap-1",
                              adjusted &&
                                "font-semibold text-amber-700 dark:text-amber-300"
                            )}
                          >
                            <Clock className="size-3 shrink-0" />
                            {start} - {end}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{session.location}</span>
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-2 shrink-0 text-[10px] sm:text-xs",
                          adjusted
                            ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                            : "border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
                        )}
                      >
                        {adjusted ? "Partial" : "Scheduled"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Upcoming Sessions
          </CardTitle>
          <CardDescription>
            Your next sessions and availability status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No upcoming sessions.
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingSessions.map((session) => {
                const myEntry = myAvailMap.get(session.id);
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 sm:px-4"
                  >
                    <div className="min-w-0 text-sm">
                      <div className="text-sm font-medium">
                        {formatDate(session.date)}
                      </div>
                      <div className="mt-0.5 flex flex-col gap-0.5 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:gap-3 sm:text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3 shrink-0" />
                          {session.startTime} - {session.endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{session.location}</span>
                        </span>
                      </div>
                    </div>
                    <div className="ml-2 shrink-0">
                      {myEntry ? (
                        <StatusChip
                          status={myEntry.status as AvailabilityStatus}
                        />
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-muted-foreground sm:text-xs"
                        >
                          No response
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

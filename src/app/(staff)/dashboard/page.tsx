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
import { LoadingState, EmptyState } from "@/components/states";
import { AVAILABILITY_STATUS } from "@/lib/availability-status";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  AlertCircle,
  LayoutGrid,
} from "lucide-react";
import type { AvailabilityStatus, Session, SessionSlot } from "@/lib/types";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function SessionRow({
  session,
  timeLabel,
  adjusted = false,
  trailing,
}: {
  session: Session;
  timeLabel: string;
  adjusted?: boolean;
  trailing: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border bg-card px-3 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2.5">
      <div className="min-w-0 text-sm">
        <div className="font-medium">{formatDate(session.date)}</div>
        <div className="mt-0.5 flex flex-col gap-0.5 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:gap-3 sm:text-xs">
          <span
            className={cn(
              "flex items-center gap-1",
              adjusted && "font-semibold text-amber-700 dark:text-amber-300"
            )}
          >
            <Clock className="size-3 shrink-0" />
            {timeLabel}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{session.location}</span>
          </span>
        </div>
      </div>
      <div className="shrink-0 sm:ml-2">{trailing}</div>
    </div>
  );
}

function StatusChip({ status }: { status: AvailabilityStatus }) {
  const config = AVAILABILITY_STATUS[status];
  const Icon = config.Icon;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 text-[10px] sm:text-xs", config.badgeClass)}
    >
      <Icon className="size-3.5" />
      <span className="capitalize">{config.label}</span>
    </Badge>
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
  const mySchedule: { slot: SessionSlot; session: Session }[] = identity
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
  const pendingCount = Math.max(totalSessions - respondedCount, 0);
  const responsePct =
    totalSessions > 0
      ? Math.round((respondedCount / totalSessions) * 100)
      : 100;
  const allCaughtUp = totalSessions > 0 && pendingCount === 0;

  return (
    <div className="space-y-5 sm:space-y-6">
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
                <h1 className="text-xl font-bold tracking-tight wrap-break-word sm:text-3xl">
                  Welcome, {displayName}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {allCaughtUp
                    ? "You're all caught up. Here's your scheduling overview."
                    : "Here's your scheduling overview at a glance."}
                </p>
              </div>
            </div>

            {totalSessions > 0 && (
              <div className="w-full shrink-0 space-y-2 sm:w-64">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Availability responses
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      allCaughtUp ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
                    )}
                  >
                    {responsePct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      allCaughtUp ? "bg-emerald-500" : "bg-primary"
                    )}
                    style={{ width: `${responsePct}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground sm:text-xs">
                  {respondedCount} of {totalSessions} sessions answered
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
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
                <CalendarCheck2 className="size-5 text-amber-600 dark:text-amber-400" />
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

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
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
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Link href="/schedule">Full schedule</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mySchedule.length === 0 ? (
                <EmptyState
                  icon={CalendarX2}
                  title="No sessions assigned yet"
                  description="You're not scheduled for any upcoming sessions. Check back after the schedule is published."
                />
              ) : (
                <div className="space-y-2">
                  {mySchedule.map(({ slot, session }) => {
                    const adjusted = Boolean(
                      slot.assignedStartTime || slot.assignedEndTime
                    );
                    const start = slot.assignedStartTime || session.startTime;
                    const end = slot.assignedEndTime || session.endTime;
                    return (
                      <SessionRow
                        key={slot.id}
                        session={session}
                        timeLabel={`${start} - ${end}`}
                        adjusted={adjusted}
                        trailing={
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] sm:text-xs",
                              adjusted
                                ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                                : "border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
                            )}
                          >
                            {adjusted ? "Partial" : "Scheduled"}
                          </Badge>
                        }
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-1.5 text-base sm:text-lg">
                  <Clock className="size-4 text-primary" />
                  Upcoming Sessions
                </CardTitle>
                <CardDescription>
                  Your next sessions and availability status.
                </CardDescription>
              </div>
              {pendingCount > 0 && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Link href="/availability">Respond</Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming sessions"
                description="There are no sessions on the calendar right now."
              />
            ) : (
              <div className="space-y-2">
                {upcomingSessions.map((session) => {
                  const myEntry = myAvailMap.get(session.id);
                  return (
                    <SessionRow
                      key={session.id}
                      session={session}
                      timeLabel={`${session.startTime} - ${session.endTime}`}
                      trailing={
                        myEntry ? (
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
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

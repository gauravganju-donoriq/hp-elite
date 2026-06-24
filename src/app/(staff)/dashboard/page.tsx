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
import { cn } from "@/lib/utils";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  XCircle,
  HelpCircle,
  MessageSquare,
  AlertCircle,
  LayoutGrid,
} from "lucide-react";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  available: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  unavailable: <XCircle className="h-4 w-4 text-red-600" />,
  maybe: <HelpCircle className="h-4 w-4 text-yellow-600" />,
  pending: <Clock className="h-4 w-4 text-gray-400" />,
};

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
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
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
  const confirmedCount = myAvailability.filter((a) => a.status === "available").length;
  const pendingCount = totalSessions - respondedCount;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome, {displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s your scheduling overview.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              Confirmed Available
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{confirmedCount}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Sessions you marked as available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
              Responded
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">
              {respondedCount}
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                /{totalSessions}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Sessions you&apos;ve submitted a response for</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
              Awaiting Response
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Sessions that still need your availability</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <LayoutGrid className="h-3.5 w-3.5 text-primary" />
              Active Schedules
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{schedules.length}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Schedules you&apos;re part of</p>
          </CardContent>
        </Card>
      </div>

      {identity && pendingCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3 sm:py-4">
            <div className="flex items-start sm:items-center gap-3">
              <CalendarCheck className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-sm font-medium">
                  {pendingCount} session{pendingCount !== 1 ? "s" : ""} need your response.
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Submit your availability so the team can plan ahead.
                </p>
              </div>
            </div>
            <Link href="/availability" className="w-full sm:w-auto">
              <Button size="sm" className="w-full sm:w-auto">Update Availability</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {identity && (
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  My Schedule
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Sessions you&apos;re actually scheduled to work.
                </CardDescription>
              </div>
              <Link href="/schedule">
                <Button variant="outline" size="sm">
                  Full schedule
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
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
                      className="flex items-center justify-between rounded-lg border px-3 sm:px-4 py-2"
                    >
                      <div className="text-sm min-w-0">
                        <div className="font-medium text-xs sm:text-sm">
                          {formatDate(session.date)}
                        </div>
                        <div className="text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-[11px] sm:text-xs">
                          <span
                            className={cn(
                              "flex items-center gap-1",
                              adjusted && "font-semibold text-amber-700"
                            )}
                          >
                            <Clock className="h-3 w-3 shrink-0" />
                            {start} - {end}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{session.location}</span>
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] sm:text-xs shrink-0 ml-2",
                          adjusted
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : "border-green-300 text-green-700"
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
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Upcoming Sessions</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Your next sessions and availability status.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
          ) : (
            <div className="space-y-2">
              {upcomingSessions.map((session) => {
                const myEntry = myAvailMap.get(session.id);
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border px-3 sm:px-4 py-2"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="text-sm min-w-0">
                        <div className="font-medium text-xs sm:text-sm">
                          {formatDate(session.date)}
                        </div>
                        <div className="text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-[11px] sm:text-xs">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            {session.startTime} - {session.endTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{session.location}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
                      {myEntry ? (
                        <div className="flex items-center gap-1">
                          {STATUS_ICONS[myEntry.status]}
                          <span className="text-[11px] sm:text-xs capitalize">
                            {myEntry.status}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] sm:text-xs text-muted-foreground">
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

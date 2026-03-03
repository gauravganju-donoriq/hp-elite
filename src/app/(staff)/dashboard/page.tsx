"use client";

import { useRouter } from "next/navigation";
import { useStaffIdentity } from "@/lib/staff-context";
import { useScheduling } from "@/lib/context";
import { useEffect } from "react";
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
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  XCircle,
  HelpCircle,
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
  const router = useRouter();
  const { identity } = useStaffIdentity();
  const { staff, schedules, availability } = useScheduling();

  useEffect(() => {
    if (!identity) router.replace("/");
  }, [identity, router]);

  if (!identity) return null;

  const currentStaff = staff.find((s) => s.id === identity.staffId);
  if (!currentStaff) return null;

  const myAvailability = availability.filter((a) => a.staffId === identity.staffId);
  const myAvailMap = new Map(myAvailability.map((a) => [a.sessionId, a]));

  const allSessions = schedules.flatMap((s) => s.sessions);
  const today = new Date().toISOString().split("T")[0];
  const upcomingSessions = allSessions
    .filter((s) => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10);

  const totalSessions = allSessions.length;
  const respondedCount = myAvailability.length;
  const confirmedCount = myAvailability.filter((a) => a.status === "available").length;
  const pendingCount = totalSessions - respondedCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {currentStaff.firstName}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s your scheduling overview.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              My Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{confirmedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Responded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {respondedCount}
              <span className="text-sm font-normal text-muted-foreground">
                /{totalSessions}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedules.length}</div>
          </CardContent>
        </Card>
      </div>

      {pendingCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <CalendarCheck className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium">
                  You have {pendingCount} sessions without a response.
                </p>
                <p className="text-sm text-muted-foreground">
                  Submit your availability so the team can plan ahead.
                </p>
              </div>
            </div>
            <Link href="/availability">
              <Button size="sm">Update Availability</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Sessions</CardTitle>
          <CardDescription>
            Your next {upcomingSessions.length} sessions and your availability status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
          ) : (
            <div className="space-y-2">
              {upcomingSessions.map((session) => {
                const myEntry = myAvailMap.get(session.id);
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-2"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <div className="font-medium">
                          {formatDate(session.date)}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
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
                    </div>
                    <div className="flex items-center gap-2">
                      {myEntry ? (
                        <div className="flex items-center gap-1">
                          {STATUS_ICONS[myEntry.status]}
                          <span className="text-xs capitalize">
                            {myEntry.status}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
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

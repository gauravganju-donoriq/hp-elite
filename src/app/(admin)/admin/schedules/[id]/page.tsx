"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useScheduling } from "@/lib/context";
import { AvailabilityGrid } from "@/components/availability-grid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  MapPin,
  Trash2,
  Users,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { schedules, availability, deleteSchedule, staff } = useScheduling();

  const schedule = schedules.find((s) => s.id === id);
  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-semibold">Schedule not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/admin")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const totalSessions = schedule.sessions.length;
  let totalRequired = 0;
  let totalConfirmed = 0;
  let totalMaybe = 0;
  let understaffedCount = 0;
  let pendingResponses = 0;

  for (const session of schedule.sessions) {
    totalRequired += session.requiredStaff;
    const sessionAvail = availability.filter((a) => a.sessionId === session.id);
    const confirmed = sessionAvail.filter((a) => a.status === "available").length;
    const maybe = sessionAvail.filter((a) => a.status === "maybe").length;
    totalConfirmed += confirmed;
    totalMaybe += maybe;
    if (confirmed < session.requiredStaff) understaffedCount++;

    const responded = sessionAvail.length;
    pendingResponses += staff.length - responded;
  }

  function handleDelete() {
    deleteSchedule(schedule!.id);
    toast.success("Schedule deleted.");
    router.push("/admin");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{schedule.name}</h1>
          {schedule.description && (
            <p className="text-muted-foreground mt-1">{schedule.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(schedule.startDate)} - {formatDate(schedule.endDate)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {[...new Set(schedule.sessions.map((s) => s.location))].join(", ")}
            </span>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-1" />
          Delete Schedule
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalConfirmed}
              <span className="text-sm font-normal text-muted-foreground">
                /{totalRequired}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-yellow-600" />
              Maybe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totalMaybe}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              Under-staffed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {understaffedCount}
              <span className="text-sm font-normal text-muted-foreground">
                /{totalSessions}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Availability Grid</h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-green-100 border border-green-300" />
              Yes
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-red-100 border border-red-300" />
              No
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-yellow-100 border border-yellow-300" />
              Maybe
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-gray-100 border border-gray-300" />
              Pending
            </span>
          </div>
        </div>
        <AvailabilityGrid schedule={schedule} />
      </div>
    </div>
  );
}

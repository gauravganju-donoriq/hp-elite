"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useScheduling } from "@/lib/context";
import { SessionSlotsPanel } from "@/components/session-slots-panel";
import { Button } from "@/components/ui/button";
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
  const { schedules, availability, deleteSchedule, sessionSlots } = useScheduling();

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
  let totalAssigned = 0;
  let totalAvailable = 0;
  let understaffedCount = 0;

  for (const session of schedule.sessions) {
    totalRequired += session.requiredStaff;
    const slots = sessionSlots.filter((s) => s.sessionId === session.id);
    const assigned = slots.filter((s) => s.assignedStaffId).length;
    totalAssigned += assigned;

    const sessionAvail = availability.filter((a) => a.sessionId === session.id);
    const available = sessionAvail.filter((a) => a.status === "available").length;
    totalAvailable += available;

    if (assigned < session.requiredStaff) understaffedCount++;
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
              Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalAssigned}
              <span className="text-sm font-normal text-muted-foreground">
                /{totalRequired}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalAvailable}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              Needs Staff
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

      <SessionSlotsPanel schedule={schedule} />
    </div>
  );
}

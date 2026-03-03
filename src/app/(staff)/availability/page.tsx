"use client";

import { useRouter } from "next/navigation";
import { useStaffIdentity } from "@/lib/staff-context";
import { useScheduling } from "@/lib/context";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Clock, MapPin, XCircle, HelpCircle } from "lucide-react";
import type { AvailabilityStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const STATUS_CONFIG: Record<
  AvailabilityStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  available: {
    label: "Available",
    icon: <CheckCircle2 className="h-4 w-4" />,
    className: "border-green-300 bg-green-50 text-green-700 hover:bg-green-100",
  },
  unavailable: {
    label: "Unavailable",
    icon: <XCircle className="h-4 w-4" />,
    className: "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
  },
  maybe: {
    label: "Maybe",
    icon: <HelpCircle className="h-4 w-4" />,
    className: "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100",
  },
  pending: {
    label: "Pending",
    icon: <Clock className="h-4 w-4" />,
    className: "border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100",
  },
};

export default function AvailabilityPage() {
  const router = useRouter();
  const { identity } = useStaffIdentity();
  const { staff, schedules, availability, setAvailability } = useScheduling();
  const [selectedSchedule, setSelectedSchedule] = useState<string>("");

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
      field === "customStartTime" ? value || undefined : existing?.customStartTime,
      field === "customEndTime" ? value || undefined : existing?.customEndTime
    );
  }

  const responded = sessions.filter((s) => myAvailMap.has(s.id)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Availability</h1>
        <p className="text-muted-foreground">
          Submit your availability for coaching sessions.
        </p>
      </div>

      {schedules.length > 1 && (
        <div className="flex items-center gap-3">
          <Label>Schedule</Label>
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
        </div>
      )}

      {schedule && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {responded}/{sessions.length} sessions responded
          </span>
          <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{
                width: sessions.length > 0
                  ? `${(responded / sessions.length) * 100}%`
                  : "0%",
              }}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sessions.map((session) => {
          const entry = myAvailMap.get(session.id);
          return (
            <Card key={session.id}>
              <CardContent className="py-3 px-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="min-w-[140px]">
                    <div className="font-medium text-sm">
                      {formatDate(session.date)}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
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

                  <div className="flex items-center gap-1.5">
                    {(
                      ["available", "unavailable", "maybe"] as AvailabilityStatus[]
                    ).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(session.id, status)}
                        className={cn(
                          "flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                          entry?.status === status
                            ? STATUS_CONFIG[status].className
                            : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {STATUS_CONFIG[status].icon}
                        {STATUS_CONFIG[status].label}
                      </button>
                    ))}
                  </div>

                  {entry?.status === "available" && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Custom time:</span>
                      <Input
                        className="h-7 w-24 text-xs"
                        placeholder="From"
                        value={entry.customStartTime || ""}
                        onChange={(e) =>
                          handleCustomTimeChange(session.id, "customStartTime", e.target.value)
                        }
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        className="h-7 w-24 text-xs"
                        placeholder="To"
                        value={entry.customEndTime || ""}
                        onChange={(e) =>
                          handleCustomTimeChange(session.id, "customEndTime", e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

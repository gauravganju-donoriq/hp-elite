"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Users, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useScheduling } from "@/lib/context";
import type { Schedule } from "@/lib/types";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ScheduleCard({ schedule }: { schedule: Schedule }) {
  const { availability } = useScheduling();

  const totalSessions = schedule.sessions.length;
  let totalRequired = 0;
  let totalConfirmed = 0;
  let understaffedCount = 0;

  for (const session of schedule.sessions) {
    totalRequired += session.requiredStaff;
    const confirmed = availability.filter(
      (a) => a.sessionId === session.id && a.status === "available"
    ).length;
    totalConfirmed += confirmed;
    if (confirmed < session.requiredStaff) understaffedCount++;
  }

  const coveragePct =
    totalRequired > 0 ? Math.round((totalConfirmed / totalRequired) * 100) : 0;

  const locations = [...new Set(schedule.sessions.map((s) => s.location))];

  return (
    <Link href={`/admin/schedules/${schedule.id}`}>
      <Card className="transition-all hover:shadow-md hover:border-foreground/20 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{schedule.name}</CardTitle>
            {understaffedCount > 0 && (
              <Badge variant="destructive" className="gap-1 shrink-0">
                <AlertTriangle className="h-3 w-3" />
                {understaffedCount} short
              </Badge>
            )}
          </div>
          {schedule.description && (
            <CardDescription className="line-clamp-2">
              {schedule.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(schedule.startDate)} - {formatDate(schedule.endDate)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {locations.join(", ")}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              {totalSessions} sessions
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span
                className={
                  coveragePct >= 80
                    ? "text-green-600"
                    : coveragePct >= 50
                      ? "text-yellow-600"
                      : "text-red-600"
                }
              >
                {coveragePct}% staffed
              </span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                coveragePct >= 80
                  ? "bg-green-500"
                  : coveragePct >= 50
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${Math.min(coveragePct, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

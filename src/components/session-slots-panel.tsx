"use client";

import { useEffect } from "react";
import { useScheduling } from "@/lib/context";
import type { Schedule, Session } from "@/lib/types";
import {
  SlotAssignmentPopover,
  SLOT_TYPE_CONFIG,
} from "@/components/slot-assignment-popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Clock,
  MapPin,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";

function formatSessionDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function SessionCard({ session }: { session: Session }) {
  const { staff, initializeSlotsForSession, getSlotsForSession } =
    useScheduling();

  useEffect(() => {
    initializeSlotsForSession(session.id, session.requiredStaff);
  }, [session.id, session.requiredStaff, initializeSlotsForSession]);

  const slots = getSlotsForSession(session.id);
  const assignedCount = slots.filter((s) => s.assignedStaffId).length;
  const isFull = assignedCount >= session.requiredStaff;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
              {formatSessionDate(session.date)}
            </CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 text-xs",
              isFull
                ? "border-green-300 bg-green-50 text-green-700"
                : "border-amber-300 bg-amber-50 text-amber-700"
            )}
          >
            <Users className="h-3 w-3 mr-1" />
            {assignedCount}/{session.requiredStaff}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {slots.map((slot) => {
            const assignedMember = slot.assignedStaffId
              ? staff.find((m) => m.id === slot.assignedStaffId)
              : null;
            const typeConfig = slot.slotType
              ? SLOT_TYPE_CONFIG[slot.slotType]
              : null;

            return (
              <SlotAssignmentPopover
                key={slot.id}
                slot={slot}
                session={session}
                allSlots={slots}
              >
                <button
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                    assignedMember
                      ? "bg-card hover:bg-accent/50"
                      : "bg-muted/30 border-dashed hover:bg-accent/50 hover:border-solid"
                  )}
                >
                  <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">
                    {slot.slotIndex + 1}.
                  </span>

                  {typeConfig ? (
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] shrink-0", typeConfig.color)}
                    >
                      {typeConfig.label}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground italic shrink-0">
                      No type
                    </span>
                  )}

                  <span className="text-muted-foreground mx-1 shrink-0">
                    &rarr;
                  </span>

                  {assignedMember ? (
                    <span className="flex items-center gap-1.5 min-w-0">
                      <User className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      <span className="truncate font-medium">
                        {assignedMember.firstName} {assignedMember.lastName}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 shrink-0"
                      >
                        {assignedMember.role === "head-coach"
                          ? "HC"
                          : assignedMember.role === "assistant-coach"
                            ? "AC"
                            : assignedMember.role === "volunteer"
                              ? "V"
                              : "I"}
                      </Badge>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Click to assign...
                    </span>
                  )}
                </button>
              </SlotAssignmentPopover>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function SessionSlotsPanel({ schedule }: { schedule: Schedule }) {
  const { autoAssignAll } = useScheduling();

  const sessions = [...schedule.sessions].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
  );

  function handleAutoAssign() {
    const { assigned, empty } = autoAssignAll(schedule.id);
    if (assigned > 0 && empty === 0) {
      toast.success(`Auto-assigned ${assigned} staff. All slots filled!`);
    } else if (assigned > 0) {
      toast.success(
        `Auto-assigned ${assigned} staff. ${empty} slot${empty > 1 ? "s" : ""} still empty.`
      );
    } else {
      toast.info("No additional staff could be auto-assigned.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Staff Assignments</h2>
        <Button size="sm" onClick={handleAutoAssign}>
          <Sparkles className="h-4 w-4 mr-1" />
          Auto Assign
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}

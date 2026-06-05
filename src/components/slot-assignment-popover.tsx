"use client";

import { useState } from "react";
import { useScheduling } from "@/lib/context";
import type { Session, SessionSlot, StaffRole } from "@/lib/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { timeRangesOverlap } from "@/lib/time";
import { Check, User, X } from "lucide-react";

const ROLE_LABELS: Record<StaffRole, string> = {
  lead: "L",
  experience: "E",
  junior: "J",
  trial: "T",
};

const ROLE_PRIORITY: Record<StaffRole, number> = {
  lead: 0,
  experience: 1,
  junior: 2,
  trial: 3,
};

interface SlotAssignmentPopoverProps {
  slot: SessionSlot;
  session: Session;
  allSlots: SessionSlot[];
  children: React.ReactNode;
}

function sortByExperience(
  a: { member: { yearsExperience: number; role: StaffRole; id: string } },
  b: { member: { yearsExperience: number; role: StaffRole; id: string } },
  assignmentCounts: Map<string, number>
) {
  const expDiff = (b.member.yearsExperience ?? 0) - (a.member.yearsExperience ?? 0);
  if (expDiff !== 0) return expDiff;
  const roleDiff = ROLE_PRIORITY[a.member.role] - ROLE_PRIORITY[b.member.role];
  if (roleDiff !== 0) return roleDiff;
  return (assignmentCounts.get(a.member.id) || 0) - (assignmentCounts.get(b.member.id) || 0);
}

export function SlotAssignmentPopover({
  slot,
  session,
  allSlots,
  children,
}: SlotAssignmentPopoverProps) {
  const {
    staff,
    schedules,
    availability,
    sessionSlots,
    assignStaffToSlot,
    unassignSlot,
  } = useScheduling();
  const [open, setOpen] = useState(false);

  const alreadyAssignedInSession = new Set(
    allSlots
      .filter((s) => s.assignedStaffId && s.id !== slot.id)
      .map((s) => s.assignedStaffId!)
  );

  // Staff already assigned to a different session on the same date whose time
  // window overlaps this one can't be double-booked (mirrors auto-assign).
  const overlappingSessionIds = new Set(
    schedules
      .flatMap((s) => s.sessions)
      .filter(
        (s) =>
          s.id !== session.id &&
          s.date === session.date &&
          timeRangesOverlap(
            session.startTime,
            session.endTime,
            s.startTime,
            s.endTime
          )
      )
      .map((s) => s.id)
  );
  const doubleBookedStaffIds = new Set(
    sessionSlots
      .filter(
        (s) => s.assignedStaffId && overlappingSessionIds.has(s.sessionId)
      )
      .map((s) => s.assignedStaffId!)
  );

  const assignmentCounts = new Map<string, number>();
  for (const s of sessionSlots) {
    if (s.assignedStaffId) {
      assignmentCounts.set(
        s.assignedStaffId,
        (assignmentCounts.get(s.assignedStaffId) || 0) + 1
      );
    }
  }

  const eligibleStaff = staff
    .filter((m) => !alreadyAssignedInSession.has(m.id))
    .filter((m) => !doubleBookedStaffIds.has(m.id))
    .map((member) => {
      const avail = availability.find(
        (a) => a.staffId === member.id && a.sessionId === session.id
      );
      const status = avail?.status || "pending";
      return { member, status };
    })
    .filter(({ status }) => status === "available" || status === "maybe");

  const availableStaff = eligibleStaff
    .filter(({ status }) => status === "available")
    .sort((a, b) => sortByExperience(a, b, assignmentCounts));

  const maybeStaff = eligibleStaff
    .filter(({ status }) => status === "maybe")
    .sort((a, b) => sortByExperience(a, b, assignmentCounts));

  function handleAssign(staffId: string) {
    assignStaffToSlot(session.id, slot.id, staffId);
    setOpen(false);
  }

  function handleClear() {
    unassignSlot(session.id, slot.id);
    setOpen(false);
  }

  const STATUS_BADGE: Record<string, string> = {
    available: "bg-green-100 text-green-800",
    maybe: "bg-yellow-100 text-yellow-800",
  };

  function renderStaffRow({ member, status }: { member: typeof staff[number]; status: string }) {
    const isAssigned = slot.assignedStaffId === member.id;
    const count = assignmentCounts.get(member.id) || 0;
    return (
      <button
        key={member.id}
        onClick={() => handleAssign(member.id)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent",
          isAssigned && "bg-accent"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isAssigned ? (
            <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
          ) : (
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="truncate">
            {member.firstName} {member.lastName}
          </span>
          <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
            {ROLE_LABELS[member.role]}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-[10px] text-muted-foreground">
            {member.yearsExperience ?? 0}yr
          </span>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded",
              STATUS_BADGE[status] ?? "bg-gray-100 text-gray-500"
            )}
          >
            {status === "available" ? "Yes" : "Maybe"}
          </span>
          {count > 0 && (
            <span className="text-[10px] text-muted-foreground">
              ({count})
            </span>
          )}
        </div>
      </button>
    );
  }

  const hasNone = availableStaff.length === 0 && maybeStaff.length === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="space-y-0">
          <div className="p-3 pb-2 border-b flex items-center justify-between">
            <p className="text-sm font-medium">Assign Staff</p>
            {slot.assignedStaffId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2 text-destructive"
                onClick={handleClear}
              >
                <X className="h-3 w-3 mr-1" /> Remove
              </Button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {hasNone && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                No eligible staff for this session. Only staff who marked
                themselves available or maybe are shown.
              </div>
            )}
            {availableStaff.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-medium text-green-700 uppercase tracking-wider">
                    Available
                  </span>
                </div>
                {availableStaff.map(renderStaffRow)}
              </>
            )}
            {maybeStaff.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1 border-t">
                  <span className="text-[10px] font-medium text-yellow-700 uppercase tracking-wider">
                    Maybe
                  </span>
                </div>
                {maybeStaff.map(renderStaffRow)}
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

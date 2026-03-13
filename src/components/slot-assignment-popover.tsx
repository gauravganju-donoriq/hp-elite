"use client";

import { useState } from "react";
import { useScheduling } from "@/lib/context";
import type { Session, SessionSlot, SlotType, StaffRole } from "@/lib/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, User, X } from "lucide-react";

export const SLOT_TYPE_CONFIG: Record<
  SlotType,
  { label: string; color: string }
> = {
  "hp-speed": { label: "HP Speed", color: "bg-blue-100 text-blue-800 border-blue-300" },
  "hp-speed-2": { label: "HP Speed 2", color: "bg-blue-100 text-blue-800 border-blue-300" },
  "hp-flight": { label: "HP Flight", color: "bg-sky-100 text-sky-800 border-sky-300" },
  footskills: { label: "Footskills", color: "bg-purple-100 text-purple-800 border-purple-300" },
  "first-touch-tempo": { label: "First Touch & Tempo", color: "bg-violet-100 text-violet-800 border-violet-300" },
  "complete-player": { label: "Complete Player", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  "1v1-transition": { label: "1v1 Transition", color: "bg-orange-100 text-orange-800 border-orange-300" },
  "shooting-finishing": { label: "Shooting & Finishing", color: "bg-red-100 text-red-800 border-red-300" },
  "ball-masters": { label: "Ball Masters", color: "bg-amber-100 text-amber-800 border-amber-300" },
  streetball: { label: "Streetball", color: "bg-lime-100 text-lime-800 border-lime-300" },
  "tournament-prep": { label: "Tournament Prep", color: "bg-rose-100 text-rose-800 border-rose-300" },
  "u5u6-minis": { label: "U5/U6 Minis", color: "bg-pink-100 text-pink-800 border-pink-300" },
  "u7u8-futures-footskills": { label: "U7/U8 Futures Footskills", color: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300" },
  "u7u8-futures-ball-striking": { label: "U7/U8 Futures Ball Striking", color: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300" },
  "u7u8-futures-complete-player": { label: "U7/U8 Futures Complete Player", color: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300" },
  general: { label: "General", color: "bg-gray-100 text-gray-700 border-gray-300" },
};

const ROLE_LABELS: Record<StaffRole, string> = {
  "head-coach": "HC",
  "assistant-coach": "AC",
  volunteer: "V",
  intern: "I",
};

const ROLE_PRIORITY: Record<StaffRole, number> = {
  "head-coach": 0,
  "assistant-coach": 1,
  volunteer: 2,
  intern: 3,
};

const AVAILABILITY_PRIORITY: Record<string, number> = {
  available: 0,
  maybe: 1,
  pending: 2,
  unavailable: 3,
};

interface SlotAssignmentPopoverProps {
  slot: SessionSlot;
  session: Session;
  allSlots: SessionSlot[];
  children: React.ReactNode;
}

export function SlotAssignmentPopover({
  slot,
  session,
  allSlots,
  children,
}: SlotAssignmentPopoverProps) {
  const {
    staff,
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

  const assignmentCounts = new Map<string, number>();
  for (const s of sessionSlots) {
    if (s.assignedStaffId) {
      assignmentCounts.set(
        s.assignedStaffId,
        (assignmentCounts.get(s.assignedStaffId) || 0) + 1
      );
    }
  }

  const recommendedStaff = staff
    .filter((m) => !alreadyAssignedInSession.has(m.id))
    .map((member) => {
      const avail = availability.find(
        (a) => a.staffId === member.id && a.sessionId === session.id
      );
      const status = avail?.status || "pending";
      return { member, status };
    })
    .sort((a, b) => {
      const availDiff =
        (AVAILABILITY_PRIORITY[a.status] ?? 99) -
        (AVAILABILITY_PRIORITY[b.status] ?? 99);
      if (availDiff !== 0) return availDiff;
      const roleDiff =
        ROLE_PRIORITY[a.member.role] - ROLE_PRIORITY[b.member.role];
      if (roleDiff !== 0) return roleDiff;
      return (
        (assignmentCounts.get(a.member.id) || 0) -
        (assignmentCounts.get(b.member.id) || 0)
      );
    });

  function handleAssign(staffId: string) {
    assignStaffToSlot(slot.id, staffId);
    setOpen(false);
  }

  function handleClear() {
    unassignSlot(slot.id);
    setOpen(false);
  }

  const STATUS_BADGE: Record<string, string> = {
    available: "bg-green-100 text-green-800",
    maybe: "bg-yellow-100 text-yellow-800",
    unavailable: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-500",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
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
            {recommendedStaff.map(({ member, status }) => {
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
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded",
                        STATUS_BADGE[status]
                      )}
                    >
                      {status === "available"
                        ? "Yes"
                        : status === "maybe"
                          ? "Maybe"
                          : status === "unavailable"
                            ? "No"
                            : "--"}
                    </span>
                    {count > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        ({count})
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

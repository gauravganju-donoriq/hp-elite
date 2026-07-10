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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { timeRangesOverlap } from "@/lib/time";
import { AlertTriangle, Check, ChevronDown, ChevronUp, Clock, User, X } from "lucide-react";

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
    setSlotTimes,
  } = useScheduling();
  const [open, setOpen] = useState(false);
  const [editTimes, setEditTimes] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [startInput, setStartInput] = useState(slot.assignedStartTime ?? session.startTime);
  const [endInput, setEndInput] = useState(slot.assignedEndTime ?? session.endTime);

  const alreadyAssignedInSession = new Set(
    allSlots
      .filter((s) => s.assignedStaffId && s.id !== slot.id)
      .map((s) => s.assignedStaffId!)
  );

  // Sessions on the same date whose time window overlaps this one. Staff booked
  // into one of these are "double-booked" for this slot (mirrors auto-assign),
  // but an admin can still override and assign them anyway.
  const overlappingSessions = schedules
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
    );
  const overlappingSessionById = new Map(
    overlappingSessions.map((s) => [s.id, s])
  );
  // Map each double-booked staff member to the conflicting session's window so
  // we can surface a helpful label in the override list.
  const conflictLabelByStaffId = new Map<string, string>();
  for (const s of sessionSlots) {
    if (!s.assignedStaffId) continue;
    const conflict = overlappingSessionById.get(s.sessionId);
    if (!conflict) continue;
    if (!conflictLabelByStaffId.has(s.assignedStaffId)) {
      conflictLabelByStaffId.set(
        s.assignedStaffId,
        `${conflict.startTime}–${conflict.endTime}`
      );
    }
  }

  const assignmentCounts = new Map<string, number>();
  for (const s of sessionSlots) {
    if (s.assignedStaffId) {
      assignmentCounts.set(
        s.assignedStaffId,
        (assignmentCounts.get(s.assignedStaffId) || 0) + 1
      );
    }
  }

  // Staff who can be assigned: not already in this session. Double-booked staff
  // stay in the list but are flagged so they route to the override section.
  const assignableStaff = staff
    .filter((m) => !alreadyAssignedInSession.has(m.id))
    .map((member) => {
      const avail = availability.find(
        (a) => a.staffId === member.id && a.sessionId === session.id
      );
      const status = avail?.status || "pending";
      const conflictLabel = conflictLabelByStaffId.get(member.id);
      return { member, status, isDoubleBooked: Boolean(conflictLabel), conflictLabel };
    });

  const availableStaff = assignableStaff
    .filter(({ status, isDoubleBooked }) => status === "available" && !isDoubleBooked)
    .sort((a, b) => sortByExperience(a, b, assignmentCounts));

  const maybeStaff = assignableStaff
    .filter(({ status, isDoubleBooked }) => status === "maybe" && !isDoubleBooked)
    .sort((a, b) => sortByExperience(a, b, assignmentCounts));

  // Staff who haven't marked themselves available/maybe (unavailable, pending,
  // or no response), plus anyone double-booked on an overlapping session. An
  // admin can still assign them via the override section.
  const otherStaff = assignableStaff
    .filter(
      ({ status, isDoubleBooked }) =>
        isDoubleBooked || (status !== "available" && status !== "maybe")
    )
    .sort((a, b) => sortByExperience(a, b, assignmentCounts));

  function handleAssign(staffId: string, override = false) {
    assignStaffToSlot(session.id, slot.id, staffId, override);
    setOpen(false);
  }

  function handleClear() {
    unassignSlot(session.id, slot.id);
    setOpen(false);
  }

  const hasCustomTimes = Boolean(slot.assignedStartTime || slot.assignedEndTime);

  function handleSaveTimes() {
    setSlotTimes(session.id, slot.id, startInput.trim(), endInput.trim());
    setEditTimes(false);
    setOpen(false);
  }

  function handleResetTimes() {
    setSlotTimes(session.id, slot.id, null, null);
    setStartInput(session.startTime);
    setEndInput(session.endTime);
    setEditTimes(false);
    setOpen(false);
  }

  const STATUS_BADGE: Record<string, string> = {
    available: "bg-green-100 text-green-800",
    maybe: "bg-yellow-100 text-yellow-800",
    unavailable: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-500",
  };

  const STATUS_LABEL: Record<string, string> = {
    available: "Yes",
    maybe: "Maybe",
    unavailable: "Unavailable",
    pending: "No reply",
  };

  function renderStaffRow({
    member,
    status,
    isDoubleBooked,
    conflictLabel,
  }: {
    member: typeof staff[number];
    status: string;
    isDoubleBooked?: boolean;
    conflictLabel?: string;
  }) {
    const isAssigned = slot.assignedStaffId === member.id;
    const count = assignmentCounts.get(member.id) || 0;
    return (
      <button
        key={member.id}
        onClick={() => handleAssign(member.id, isDoubleBooked)}
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
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate">
                {member.firstName} {member.lastName}
              </span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                {ROLE_LABELS[member.role]}
              </Badge>
            </div>
            {isDoubleBooked && (
              <span className="flex items-center gap-1 text-[10px] text-amber-600">
                <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                Double-booked{conflictLabel ? `: ${conflictLabel}` : ""}
              </span>
            )}
          </div>
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
            {STATUS_LABEL[status] ?? "No reply"}
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

  const hasNone =
    availableStaff.length === 0 &&
    maybeStaff.length === 0 &&
    otherStaff.length === 0;

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
          {slot.assignedStaffId && (
            <div className="px-3 py-2 border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Worked: {slot.assignedStartTime ?? session.startTime}–
                    {slot.assignedEndTime ?? session.endTime}
                    {hasCustomTimes && (
                      <span className="ml-1 text-[10px] text-foreground">(adjusted)</span>
                    )}
                  </span>
                </div>
                {!editTimes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => {
                      setStartInput(slot.assignedStartTime ?? session.startTime);
                      setEndInput(slot.assignedEndTime ?? session.endTime);
                      setEditTimes(true);
                    }}
                  >
                    Adjust
                  </Button>
                )}
              </div>
              {editTimes && (
                <div className="mt-2 space-y-2">
                  <p className="text-[10px] text-muted-foreground">
                    Session window {session.startTime}–{session.endTime}. Set the
                    actual hours worked for payroll.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={startInput}
                      onChange={(e) => setStartInput(e.target.value)}
                      placeholder="9:00 AM"
                      className="h-7 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input
                      value={endInput}
                      onChange={(e) => setEndInput(e.target.value)}
                      placeholder="12:00 PM"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="h-6 text-xs px-2" onClick={handleSaveTimes}>
                      Save
                    </Button>
                    {hasCustomTimes && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={handleResetTimes}
                      >
                        Reset to full
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setEditTimes(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="max-h-64 overflow-y-auto">
            {hasNone && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                No assignable staff for this session. Everyone is already
                assigned or double-booked at this time.
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
            {otherStaff.length > 0 && (
              <div className="border-t">
                <button
                  type="button"
                  onClick={() => setShowOverride((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors hover:bg-accent"
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    Schedule anyway ({otherStaff.length})
                  </span>
                  {showOverride ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
                {showOverride && (
                  <>
                    <p className="px-3 pb-1.5 text-[10px] leading-snug text-muted-foreground">
                      These staff haven&apos;t marked themselves available or are
                      already booked at this time. Assigning here overrides that.
                    </p>
                    {otherStaff.map(renderStaffRow)}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

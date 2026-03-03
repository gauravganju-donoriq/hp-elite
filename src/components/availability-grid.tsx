"use client";

import { useScheduling } from "@/lib/context";
import type { Schedule, Session, AvailabilityStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

const STATUS_CONFIG: Record<
  AvailabilityStatus,
  { label: string; shortLabel: string; className: string }
> = {
  available: {
    label: "Available",
    shortLabel: "Yes",
    className: "bg-green-100 text-green-800 border-green-300 hover:bg-green-200",
  },
  unavailable: {
    label: "Unavailable",
    shortLabel: "No",
    className: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200",
  },
  maybe: {
    label: "Maybe",
    shortLabel: "?",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200",
  },
  pending: {
    label: "Pending",
    shortLabel: "--",
    className: "bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200",
  },
};

function formatDateHeader(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return {
    dayAbbr: d.toLocaleDateString("en-US", { weekday: "short" }),
    monthDay: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

function CellPopover({
  staffId,
  staffName,
  session,
  currentStatus,
  currentCustomStart,
  currentCustomEnd,
}: {
  staffId: string;
  staffName: string;
  session: Session;
  currentStatus: AvailabilityStatus | null;
  currentCustomStart?: string;
  currentCustomEnd?: string;
}) {
  const { setAvailability, removeAvailability } = useScheduling();
  const [customStart, setCustomStart] = useState(currentCustomStart || "");
  const [customEnd, setCustomEnd] = useState(currentCustomEnd || "");
  const [open, setOpen] = useState(false);

  const { dayAbbr, monthDay } = formatDateHeader(session.date);

  function handleSet(status: AvailabilityStatus) {
    setAvailability(
      staffId,
      session.id,
      status,
      customStart || undefined,
      customEnd || undefined
    );
    setOpen(false);
  }

  function handleClear() {
    removeAvailability(staffId, session.id);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-full h-full min-h-[32px] min-w-[52px] rounded border text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
            currentStatus
              ? STATUS_CONFIG[currentStatus].className
              : "bg-muted/40 text-muted-foreground/50 border-transparent hover:bg-muted"
          )}
        >
          {currentStatus ? STATUS_CONFIG[currentStatus].shortLabel : ""}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="center">
        <div className="space-y-3">
          <div>
            <p className="font-medium text-sm">{staffName}</p>
            <p className="text-xs text-muted-foreground">
              {dayAbbr} {monthDay} &middot; {session.startTime} - {session.endTime}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              ["available", "unavailable", "maybe", "pending"] as AvailabilityStatus[]
            ).map((status) => (
              <Button
                key={status}
                size="sm"
                variant={currentStatus === status ? "default" : "outline"}
                className="text-xs"
                onClick={() => handleSet(status)}
              >
                {STATUS_CONFIG[status].label}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Custom Time Window (optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Start"
                className="h-8 text-xs"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <Input
                placeholder="End"
                className="h-8 text-xs"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
          {currentStatus && (
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-xs text-destructive"
              onClick={handleClear}
            >
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AvailabilityGrid({ schedule }: { schedule: Schedule }) {
  const { staff, availability } = useScheduling();

  const sessions = [...schedule.sessions].sort(
    (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
  );

  const sortedStaff = [...staff].sort((a, b) =>
    a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
  );

  const availMap = new Map<string, { status: AvailabilityStatus; customStartTime?: string; customEndTime?: string }>();
  for (const a of availability) {
    availMap.set(`${a.staffId}-${a.sessionId}`, {
      status: a.status,
      customStartTime: a.customStartTime,
      customEndTime: a.customEndTime,
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 z-20 bg-muted/95 backdrop-blur px-3 py-2 text-left font-medium min-w-[160px]">
              Day
            </th>
            {sessions.map((session) => {
              const { dayAbbr, monthDay } = formatDateHeader(session.date);
              return (
                <th
                  key={session.id}
                  className="px-1 py-2 text-center font-normal min-w-[56px]"
                >
                  <div className="text-xs font-medium">{dayAbbr}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {monthDay}
                  </div>
                </th>
              );
            })}
          </tr>
          <tr className="border-b bg-muted/30">
            <th className="sticky left-0 z-20 bg-muted/95 backdrop-blur px-3 py-1 text-left text-xs text-muted-foreground">
              Time
            </th>
            {sessions.map((session) => (
              <th
                key={session.id}
                className="px-1 py-1 text-center text-[10px] text-muted-foreground font-normal"
              >
                {session.startTime}
                <br />
                {session.endTime}
              </th>
            ))}
          </tr>
          <tr className="border-b bg-muted/30">
            <th className="sticky left-0 z-20 bg-muted/95 backdrop-blur px-3 py-1 text-left text-xs text-muted-foreground">
              Location
            </th>
            {sessions.map((session) => (
              <th
                key={session.id}
                className="px-1 py-1 text-center text-[10px] text-muted-foreground font-normal"
              >
                {session.location === "Field House" ? "FH" : session.location === "K Sport" ? "KS" : session.location}
              </th>
            ))}
          </tr>
          <tr className="border-b bg-muted/30">
            <th className="sticky left-0 z-20 bg-muted/95 backdrop-blur px-3 py-1 text-left text-xs text-muted-foreground">
              Required
            </th>
            {sessions.map((session) => {
              const confirmed = availability.filter(
                (a) => a.sessionId === session.id && a.status === "available"
              ).length;
              const isShort = confirmed < session.requiredStaff;
              return (
                <th
                  key={session.id}
                  className="px-1 py-1 text-center font-normal"
                >
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      isShort ? "text-red-600" : "text-green-600"
                    )}
                  >
                    {confirmed}/{session.requiredStaff}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedStaff.map((member) => (
            <tr key={member.id} className="border-b hover:bg-muted/20">
              <td className="sticky left-0 z-10 bg-background px-3 py-1 font-medium whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span>
                    {member.lastName}, {member.firstName}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {member.role === "head-coach"
                      ? "HC"
                      : member.role === "assistant-coach"
                        ? "AC"
                        : member.role === "volunteer"
                          ? "V"
                          : "I"}
                  </Badge>
                </div>
              </td>
              {sessions.map((session) => {
                const key = `${member.id}-${session.id}`;
                const entry = availMap.get(key);
                return (
                  <td key={session.id} className="px-0.5 py-0.5 text-center">
                    <CellPopover
                      staffId={member.id}
                      staffName={`${member.firstName} ${member.lastName}`}
                      session={session}
                      currentStatus={entry?.status ?? null}
                      currentCustomStart={entry?.customStartTime}
                      currentCustomEnd={entry?.customEndTime}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

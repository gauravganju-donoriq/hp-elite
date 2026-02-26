"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimeSlot } from "@/lib/types";

interface AvailabilityCalendarProps {
  startDate: string;
  endDate: string;
  slots: TimeSlot[];
  onSave: (slots: TimeSlot[]) => void;
}

const HOURS = Array.from({ length: 15 }, (_, i) => {
  const h = i + 8;
  return `${String(h).padStart(2, "0")}:00`;
});

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T12:00:00");
  const last = new Date(end + "T12:00:00");
  while (cur <= last) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function getWeeks(dates: string[]): string[][] {
  const weeks: string[][] = [];
  let current: string[] = [];

  if (dates.length === 0) return weeks;

  const firstDay = new Date(dates[0] + "T12:00:00").getDay();
  for (let i = 0; i < firstDay; i++) current.push("");

  for (const d of dates) {
    current.push(d);
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    while (current.length < 7) current.push("");
    weeks.push(current);
  }

  return weeks;
}

export function AvailabilityCalendar({
  startDate,
  endDate,
  slots,
  onSave,
}: AvailabilityCalendarProps) {
  const [localSlots, setLocalSlots] = useState<TimeSlot[]>(slots);
  const [dirty, setDirty] = useState(false);

  const allDates = useMemo(
    () => getDatesInRange(startDate, endDate),
    [startDate, endDate]
  );
  const weeks = useMemo(() => getWeeks(allDates), [allDates]);

  const slotMap = useMemo(() => {
    const m = new Map<string, TimeSlot>();
    for (const s of localSlots) m.set(s.date, s);
    return m;
  }, [localSlots]);

  function toggleDate(date: string) {
    setDirty(true);
    if (slotMap.has(date)) {
      setLocalSlots((prev) => prev.filter((s) => s.date !== date));
    } else {
      setLocalSlots((prev) => [
        ...prev,
        { date, startTime: "17:00", endTime: "20:00" },
      ]);
    }
  }

  function updateSlotTime(
    date: string,
    field: "startTime" | "endTime",
    value: string
  ) {
    setDirty(true);
    setLocalSlots((prev) =>
      prev.map((s) => (s.date === date ? { ...s, [field]: value } : s))
    );
  }

  function handleSave() {
    onSave(localSlots);
    setDirty(false);
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Click dates to mark yourself available. Click again to remove.
          Tap an available date to adjust the time window.
        </p>
        <Button onClick={handleSave} disabled={!dirty}>
          <Check className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-green-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-muted" />
          <span>Not set</span>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-7 bg-muted/50">
          {dayNames.map((d) => (
            <div
              key={d}
              className="p-2 text-center text-xs font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-t">
            {week.map((date, di) => {
              if (!date) {
                return <div key={`empty-${di}`} className="p-2 min-h-[72px]" />;
              }

              const slot = slotMap.get(date);
              const isAvailable = !!slot;
              const d = new Date(date + "T12:00:00");
              const dayNum = d.getDate();
              const isToday =
                date === new Date().toISOString().split("T")[0];

              return (
                <Popover key={date}>
                  <PopoverTrigger asChild>
                    <button
                      onClick={() => {
                        if (!isAvailable) toggleDate(date);
                      }}
                      className={`relative p-2 min-h-[72px] text-left transition-colors hover:bg-accent/50 border-r last:border-r-0 ${
                        isAvailable
                          ? "bg-green-50"
                          : ""
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${
                          isToday
                            ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                            : ""
                        }`}
                      >
                        {dayNum}
                      </span>
                      {isAvailable && (
                        <div className="mt-1">
                          <span className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                            {slot.startTime}-{slot.endTime}
                          </span>
                        </div>
                      )}
                    </button>
                  </PopoverTrigger>
                  {isAvailable && slot && (
                    <PopoverContent className="w-64" align="center">
                      <div className="space-y-3">
                        <div className="font-medium text-sm">
                          {d.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Available From</Label>
                          <Select
                            value={slot.startTime}
                            onValueChange={(v) =>
                              updateSlotTime(date, "startTime", v)
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {HOURS.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Available Until</Label>
                          <Select
                            value={slot.endTime}
                            onValueChange={(v) =>
                              updateSlotTime(date, "endTime", v)
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {HOURS.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => toggleDate(date)}
                        >
                          <X className="mr-2 h-3 w-3" />
                          Remove Availability
                        </Button>
                      </div>
                    </PopoverContent>
                  )}
                </Popover>
              );
            })}
          </div>
        ))}
      </div>

      <div className="text-sm text-muted-foreground text-center">
        {localSlots.length} day{localSlots.length !== 1 ? "s" : ""} marked as
        available out of {allDates.length} tournament days
      </div>
    </div>
  );
}

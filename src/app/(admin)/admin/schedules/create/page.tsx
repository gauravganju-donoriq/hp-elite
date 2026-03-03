"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScheduling } from "@/lib/context";
import type { Session } from "@/lib/types";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface RecurringPattern {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string;
  requiredStaff: number;
}

export default function CreateSchedulePage() {
  const router = useRouter();
  const { addSchedule } = useScheduling();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [patterns, setPatterns] = useState<RecurringPattern[]>([
    { dayOfWeek: 1, startTime: "5:00 PM", endTime: "8:00 PM", location: "Field House", requiredStaff: 8 },
  ]);

  function addPattern() {
    setPatterns((prev) => [
      ...prev,
      { dayOfWeek: 2, startTime: "5:00 PM", endTime: "8:00 PM", location: "Field House", requiredStaff: 8 },
    ]);
  }

  function removePattern(idx: number) {
    setPatterns((prev) => prev.filter((_, i) => i !== idx));
  }

  function updatePattern(idx: number, updates: Partial<RecurringPattern>) {
    setPatterns((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...updates } : p))
    );
  }

  function generateSessions(): Session[] {
    if (!startDate || !endDate) return [];
    const sessions: Session[] = [];
    const start = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");
    const scheduleId = `sched-${Date.now()}`;
    let counter = 0;

    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      const matchingPatterns = patterns.filter((p) => p.dayOfWeek === dayOfWeek);
      for (const pattern of matchingPatterns) {
        const dateStr = current.toISOString().split("T")[0];
        sessions.push({
          id: `sess-${scheduleId}-${counter++}`,
          scheduleId,
          date: dateStr,
          dayOfWeek: DAYS[dayOfWeek],
          startTime: pattern.startTime,
          endTime: pattern.endTime,
          location: pattern.location,
          requiredStaff: pattern.requiredStaff,
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return sessions;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !startDate || !endDate) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (patterns.length === 0) {
      toast.error("Add at least one recurring session pattern.");
      return;
    }

    const sessions = generateSessions();
    if (sessions.length === 0) {
      toast.error("No sessions generated. Check your date range and patterns.");
      return;
    }

    const id = `sched-${Date.now()}`;
    for (const s of sessions) {
      s.scheduleId = id;
    }

    addSchedule({
      id,
      name,
      description: description || undefined,
      startDate,
      endDate,
      sessions,
    });

    toast.success(`Schedule created with ${sessions.length} sessions.`);
    router.push("/admin");
  }

  const previewSessions = generateSessions();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Schedule</h1>
        <p className="text-muted-foreground">
          Set up a recurring schedule for coaching sessions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Schedule Name *</Label>
              <Input
                id="name"
                placeholder="e.g. March 2026 Training Block"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional notes about this schedule..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recurring Session Patterns</CardTitle>
            <CardDescription>
              Define which days of the week have sessions. Sessions will be
              generated for each matching day in your date range.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {patterns.map((pattern, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-end gap-3 rounded-lg border p-3"
              >
                <div className="space-y-1 min-w-[120px]">
                  <Label className="text-xs">Day</Label>
                  <Select
                    value={String(pattern.dayOfWeek)}
                    onValueChange={(v) =>
                      updatePattern(idx, { dayOfWeek: parseInt(v) })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((day, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Start</Label>
                  <Input
                    className="h-9 w-28"
                    value={pattern.startTime}
                    onChange={(e) =>
                      updatePattern(idx, { startTime: e.target.value })
                    }
                    placeholder="5:00 PM"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End</Label>
                  <Input
                    className="h-9 w-28"
                    value={pattern.endTime}
                    onChange={(e) =>
                      updatePattern(idx, { endTime: e.target.value })
                    }
                    placeholder="8:00 PM"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Location</Label>
                  <Input
                    className="h-9 w-32"
                    value={pattern.location}
                    onChange={(e) =>
                      updatePattern(idx, { location: e.target.value })
                    }
                    placeholder="Field House"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Staff Needed</Label>
                  <Input
                    className="h-9 w-20"
                    type="number"
                    min={1}
                    value={pattern.requiredStaff}
                    onChange={(e) =>
                      updatePattern(idx, {
                        requiredStaff: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePattern(idx)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addPattern}>
              <Plus className="mr-2 h-4 w-4" />
              Add Pattern
            </Button>
          </CardContent>
        </Card>

        {previewSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                {previewSessions.length} sessions will be generated.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-48 overflow-y-auto text-sm space-y-1">
                {previewSessions.slice(0, 20).map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-muted-foreground"
                  >
                    <span className="font-medium text-foreground w-24">
                      {s.dayOfWeek}
                    </span>
                    <span className="w-24">{s.date}</span>
                    <span>
                      {s.startTime} - {s.endTime}
                    </span>
                    <span>{s.location}</span>
                    <span>({s.requiredStaff} staff)</span>
                  </div>
                ))}
                {previewSessions.length > 20 && (
                  <p className="text-muted-foreground pt-1">
                    ... and {previewSessions.length - 20} more
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button type="submit">Create Schedule</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

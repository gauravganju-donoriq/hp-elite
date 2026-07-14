"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Loader2, CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState, LoadingState } from "@/components/states";
import { useStaffIdentity } from "@/lib/staff-context";
import { useScheduling } from "@/lib/context";
import type { HoursSubmission } from "@/lib/types";
import {
  addDays,
  formatISODate,
  parseISODate,
  todayISO,
} from "@/lib/dates";

interface WeekOption {
  weekStart: string;
  weekEnd: string;
  label: string;
}

function startOfWeekISO(iso: string): string {
  const d = parseISODate(iso);
  const day = d.getUTCDay();
  const adjusted = (day + 6) % 7; // Monday = 0
  return formatISODate(addDays(d, -adjusted));
}

function formatShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatShortYear(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function StaffHoursPage() {
  const { identity, loading: identityLoading } = useStaffIdentity();
  const { schedules, loading: schedulesLoading } = useScheduling();

  const [submissions, setSubmissions] = useState<HoursSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingWeek, setSavingWeek] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { hours: string; notes: string }>
  >({});

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hours");
      if (!res.ok) throw new Error("Failed to load your hours");
      setSubmissions((await res.json()) as HoursSubmission[]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load your hours."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // Every completed Mon-Sun week that overlaps a schedule date range.
  const weeks = useMemo<WeekOption[]>(() => {
    if (schedules.length === 0) return [];
    const today = todayISO();

    let minStart: string | null = null;
    let maxEnd: string | null = null;
    for (const s of schedules) {
      if (!minStart || s.startDate < minStart) minStart = s.startDate;
      if (!maxEnd || s.endDate > maxEnd) maxEnd = s.endDate;
    }
    if (!minStart || !maxEnd) return [];

    const out: WeekOption[] = [];
    let cursor = startOfWeekISO(minStart);
    while (cursor <= maxEnd) {
      const weekEnd = formatISODate(addDays(parseISODate(cursor), 6));
      // Only weeks that have already ended can have hours submitted.
      if (weekEnd < today) {
        out.push({
          weekStart: cursor,
          weekEnd,
          label: `${formatShort(cursor)} - ${formatShortYear(weekEnd)}`,
        });
      }
      cursor = formatISODate(addDays(parseISODate(cursor), 7));
    }
    // Most recent week first.
    return out.reverse();
  }, [schedules]);

  const submissionByWeek = useMemo(() => {
    const m = new Map<string, HoursSubmission>();
    for (const s of submissions) m.set(s.weekStart, s);
    return m;
  }, [submissions]);

  function getDraft(week: WeekOption) {
    const draft = drafts[week.weekStart];
    if (draft) return draft;
    const existing = submissionByWeek.get(week.weekStart);
    return {
      hours: existing ? String(existing.submittedHours) : "",
      notes: existing?.notes ?? "",
    };
  }

  function setDraft(weekStart: string, patch: Partial<{ hours: string; notes: string }>) {
    setDrafts((prev) => {
      const base =
        prev[weekStart] ??
        (() => {
          const existing = submissionByWeek.get(weekStart);
          return {
            hours: existing ? String(existing.submittedHours) : "",
            notes: existing?.notes ?? "",
          };
        })();
      return { ...prev, [weekStart]: { ...base, ...patch } };
    });
  }

  async function handleSave(week: WeekOption) {
    const draft = getDraft(week);
    const hours = Number(draft.hours);
    if (draft.hours.trim() === "" || !Number.isFinite(hours) || hours < 0) {
      toast.error("Enter a valid number of hours.");
      return;
    }

    setSavingWeek(week.weekStart);
    try {
      const res = await fetch("/api/hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: week.weekStart,
          weekEnd: week.weekEnd,
          submittedHours: hours,
          notes: draft.notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to submit hours");
      }
      const saved = (await res.json()) as HoursSubmission;
      setSubmissions((prev) => {
        const rest = prev.filter((s) => s.weekStart !== saved.weekStart);
        return [saved, ...rest];
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[week.weekStart];
        return next;
      });
      toast.success("Hours submitted.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit hours."
      );
    } finally {
      setSavingWeek(null);
    }
  }

  const busy = identityLoading || schedulesLoading || loading;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="My Hours"
        description="After each week ends, report the hours you actually worked. Your admin compares these against the scheduled hours."
      />

      {!identity && !identityLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Your account isn&apos;t linked to a staff profile yet, so you
            can&apos;t submit hours.
          </CardContent>
        </Card>
      ) : busy ? (
        <LoadingState label="Loading your weeks..." />
      ) : weeks.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No completed weeks yet"
          description="Once a scheduled week has ended, it will show up here for you to submit your hours."
        />
      ) : (
        <div className="space-y-3">
          {weeks.map((week) => {
            const existing = submissionByWeek.get(week.weekStart);
            const draft = getDraft(week);
            const saving = savingWeek === week.weekStart;
            return (
              <Card key={week.weekStart}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="h-4 w-4 text-primary" />
                      {week.label}
                    </CardTitle>
                    {existing ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {existing.submittedHours} hrs submitted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Not submitted
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    Week of {formatShort(week.weekStart)} through{" "}
                    {formatShort(week.weekEnd)}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                    <div className="space-y-1.5">
                      <Label htmlFor={`hours-${week.weekStart}`}>
                        Hours worked
                      </Label>
                      <Input
                        id={`hours-${week.weekStart}`}
                        type="number"
                        min={0}
                        step="0.25"
                        inputMode="decimal"
                        placeholder="e.g. 12.5"
                        value={draft.hours}
                        onChange={(e) =>
                          setDraft(week.weekStart, { hours: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`notes-${week.weekStart}`}>
                        Notes (optional)
                      </Label>
                      <Input
                        id={`notes-${week.weekStart}`}
                        placeholder="Anything the admin should know"
                        value={draft.notes}
                        onChange={(e) =>
                          setDraft(week.weekStart, { notes: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-stretch sm:justify-end">
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => handleSave(week)}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {existing ? "Update hours" : "Submit hours"}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

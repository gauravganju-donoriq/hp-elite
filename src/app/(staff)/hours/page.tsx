"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Clock,
  Loader2,
  Save,
} from "lucide-react";
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
  const submittedCount = weeks.filter((week) =>
    submissionByWeek.has(week.weekStart)
  ).length;
  const outstandingCount = Math.max(weeks.length - submittedCount, 0);
  const totalSubmittedHours = weeks.reduce(
    (total, week) =>
      total + (submissionByWeek.get(week.weekStart)?.submittedHours ?? 0),
    0
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <Card className="overflow-hidden border-primary/15 bg-linear-to-br from-primary/10 via-card to-card">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm sm:size-12">
                <CalendarClock className="size-5 sm:size-6" />
              </span>
              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Time reporting
                </p>
                <h1 className="text-xl font-bold tracking-tight sm:text-3xl">
                  My Hours
                </h1>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Report your completed weekly hours so the admin can compare
                  them with the published schedule.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x overflow-hidden rounded-xl border bg-background/70 shadow-sm lg:w-80 lg:shrink-0">
              <div className="px-3 py-2.5 text-center sm:px-5">
                <p className="text-lg font-bold tabular-nums sm:text-xl">
                  {busy ? "—" : totalSubmittedHours}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                  Hours
                </p>
              </div>
              <div className="px-3 py-2.5 text-center sm:px-5">
                <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400 sm:text-xl">
                  {busy ? "—" : submittedCount}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                  Submitted
                </p>
              </div>
              <div className="px-3 py-2.5 text-center sm:px-5">
                <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400 sm:text-xl">
                  {busy ? "—" : outstandingCount}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                  Pending
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
        <div className="grid gap-4 xl:grid-cols-2">
          {weeks.map((week) => {
            const existing = submissionByWeek.get(week.weekStart);
            const draft = getDraft(week);
            const saving = savingWeek === week.weekStart;
            return (
              <Card
                key={week.weekStart}
                className="gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md"
              >
                <CardHeader className="border-b bg-muted/25 p-4 sm:p-5">
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={
                          existing
                            ? "flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }
                      >
                        {existing ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <CircleDashed className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">
                          {week.label}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Monday through Sunday
                        </CardDescription>
                      </div>
                    </div>
                    {existing ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        {existing.submittedHours} hrs
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                      >
                        Pending
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
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
                        className="font-medium tabular-nums"
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
                  <div className="flex items-center justify-between gap-3 border-t pt-4">
                    <p className="hidden text-xs text-muted-foreground sm:block">
                      {existing
                        ? "Last submitted value is shown."
                        : "Ready when your week is complete."}
                    </p>
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => handleSave(week)}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="size-4" />
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

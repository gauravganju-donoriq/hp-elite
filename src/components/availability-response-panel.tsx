"use client";

import { useMemo, useState } from "react";
import { useScheduling } from "@/lib/context";
import type { Schedule } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ChevronDown,
  CircleSlash,
  Clock,
  Mail,
  Send,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateDisplay } from "@/lib/dates";

const ROLE_ABBR: Record<string, string> = {
  lead: "L",
  experience: "E",
  junior: "J",
  trial: "T",
};

type ResponseStatus = "complete" | "partial" | "none";

interface StaffResponse {
  id: string;
  name: string;
  role: string;
  email?: string;
  respondedCount: number;
  totalSessions: number;
  status: ResponseStatus;
  missingSessions: { id: string; date: string; startTime: string; endTime: string }[];
}

function StatusPill({ status }: { status: ResponseStatus }) {
  if (status === "complete") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        <CheckCircle2 className="h-3 w-3" />
        Complete
      </Badge>
    );
  }
  if (status === "partial") {
    return (
      <Badge
        variant="outline"
        className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
      >
        <Clock className="h-3 w-3" />
        In progress
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
    >
      <CircleSlash className="h-3 w-3" />
      Not started
    </Badge>
  );
}

export function AvailabilityResponsePanel({ schedule }: { schedule: Schedule }) {
  const { staff, availability } = useScheduling();
  const [incompleteOnly, setIncompleteOnly] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sessions = useMemo(
    () =>
      [...schedule.sessions].sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
      ),
    [schedule.sessions]
  );

  const responses = useMemo<StaffResponse[]>(() => {
    const sessionIds = new Set(sessions.map((s) => s.id));
    const respondedKeys = new Set<string>();
    for (const a of availability) {
      if (sessionIds.has(a.sessionId)) {
        respondedKeys.add(`${a.staffId}-${a.sessionId}`);
      }
    }

    const total = sessions.length;

    return staff
      .map((member): StaffResponse => {
        const missingSessions = sessions.filter(
          (s) => !respondedKeys.has(`${member.id}-${s.id}`)
        );
        const respondedCount = total - missingSessions.length;
        const status: ResponseStatus =
          total === 0 || respondedCount === total
            ? "complete"
            : respondedCount === 0
              ? "none"
              : "partial";
        return {
          id: member.id,
          name: `${member.lastName}, ${member.firstName}`,
          role: member.role,
          email: member.email,
          respondedCount,
          totalSessions: total,
          status,
          missingSessions: missingSessions.map((s) => ({
            id: s.id,
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        };
      })
      .sort((a, b) => {
        // Incomplete first (none, then partial, then complete), then by name.
        const order: Record<ResponseStatus, number> = {
          none: 0,
          partial: 1,
          complete: 2,
        };
        return order[a.status] - order[b.status] || a.name.localeCompare(b.name);
      });
  }, [staff, availability, sessions]);

  const fullyResponded = responses.filter((r) => r.status === "complete").length;
  const partiallyResponded = responses.filter((r) => r.status === "partial").length;
  const notStarted = responses.filter((r) => r.status === "none").length;
  const totalStaff = responses.length;
  const totalAnswers = responses.reduce((sum, r) => sum + r.respondedCount, 0);
  const totalPossibleAnswers = totalStaff * sessions.length;
  const responsePercent =
    totalPossibleAnswers > 0
      ? Math.round((totalAnswers / totalPossibleAnswers) * 100)
      : 0;

  const incomplete = responses.filter((r) => r.status !== "complete");
  const visible = incompleteOnly ? incomplete : responses;

  const incompleteWithoutEmail = incomplete.filter((r) => !r.email).length;

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function buildMailto(r: StaffResponse): string {
    const subject = `Availability needed: ${schedule.name}`;
    const firstName = r.name.split(",")[1]?.trim() || "there";
    const body = `Hi ${firstName},\n\nPlease submit your availability for "${schedule.name}" as soon as you can. You can update it from your dashboard.\n\nThanks!`;
    return `mailto:${encodeURIComponent(r.email!)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <CardHeader className="border-b bg-muted/30 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-10">
            <UsersRound className="size-4 sm:size-5" />
          </span>
          <div className="min-w-0">
            <CardTitle>Availability responses</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              See who has finished and follow up on missing answers.
            </p>
          </div>
        </div>

        {sessions.length > 0 && totalStaff > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(7rem,1fr))]">
            <div className="col-span-2 rounded-lg border bg-background p-3 sm:col-span-3 sm:p-4 lg:col-span-1">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Overall completion
                  </p>
                  <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
                    {responsePercent}%
                  </p>
                </div>
                <p className="pb-0.5 text-xs text-muted-foreground tabular-nums">
                  {totalAnswers} of {totalPossibleAnswers} answers
                </p>
              </div>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Overall availability response completion"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={responsePercent}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${responsePercent}%` }}
                />
              </div>
            </div>
            <ResponseSummary
              label="Complete"
              value={fullyResponded}
              icon={CheckCircle2}
              tone="success"
            />
            <ResponseSummary
              label="In progress"
              value={partiallyResponded}
              icon={Clock}
              tone="warning"
            />
            <ResponseSummary
              label="Not started"
              value={notStarted}
              icon={CircleSlash}
              tone="danger"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="px-0">
        {sessions.length === 0 ? (
          <div className="px-4 py-8 text-center sm:px-6 sm:py-10">
            <Clock className="mx-auto size-8 text-muted-foreground/60" />
            <p className="mt-3 font-medium">No responses to collect yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add sessions to this schedule to start collecting availability.
            </p>
          </div>
        ) : totalStaff === 0 ? (
          <div className="px-4 py-8 text-center sm:px-6 sm:py-10">
            <UsersRound className="mx-auto size-8 text-muted-foreground/60" />
            <p className="mt-3 font-medium">No staff on the roster</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add staff before requesting availability.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="px-4 py-8 text-center sm:px-6 sm:py-10">
            <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckCircle2 className="size-5" />
            </span>
            <p className="mt-3 font-medium">Everyone has responded</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Availability is complete for every session.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setIncompleteOnly(false)}
            >
              View all staff
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="text-sm font-medium">
                  {incompleteOnly ? "Needs attention" : "All staff"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {incomplete.length === 0
                    ? "Every staff member is complete."
                    : `${incomplete.length} ${incomplete.length === 1 ? "person has" : "people have"} unanswered sessions.`}
                </p>
              </div>
              <div className="inline-flex w-fit rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setIncompleteOnly(true)}
                  aria-pressed={incompleteOnly}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    incompleteOnly
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Needs response
                  {incomplete.length > 0 && (
                    <span className="ml-1.5 tabular-nums">{incomplete.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIncompleteOnly(false)}
                  aria-pressed={!incompleteOnly}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    !incompleteOnly
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All
                  <span className="ml-1.5 tabular-nums">{totalStaff}</span>
                </button>
              </div>
            </div>

            <div className="divide-y">
              {visible.map((r) => {
                const isOpen = expanded.has(r.id);
                const canExpand = r.missingSessions.length > 0;
                return (
                  <div key={r.id} className="px-4 py-3 sm:px-6 sm:py-4">
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,0.7fr)_auto] sm:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initialsForName(r.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-sm font-medium">{r.name}</p>
                            <Badge
                              variant="outline"
                              className="px-1.5 py-0 text-[10px] text-muted-foreground"
                              title={r.role}
                            >
                              {ROLE_ABBR[r.role] ?? "?"}
                            </Badge>
                          </div>
                          <div className="mt-1">
                            <StatusPill status={r.status} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-muted-foreground">
                            Sessions answered
                          </span>
                          <span className="font-medium tabular-nums">
                            {r.respondedCount} / {r.totalSessions}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              r.status === "complete"
                                ? "bg-emerald-500"
                                : r.status === "none"
                                  ? "bg-red-500"
                                  : "bg-amber-500"
                            )}
                            style={{
                              width: `${r.totalSessions > 0 ? (r.respondedCount / r.totalSessions) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        {canExpand && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(r.id)}
                            aria-expanded={isOpen}
                            className="flex-1 text-muted-foreground sm:flex-none"
                          >
                            {r.missingSessions.length} missing
                            <ChevronDown
                              className={cn(
                                "size-4 transition-transform",
                                isOpen && "rotate-180"
                              )}
                            />
                          </Button>
                        )}
                        {r.status !== "complete" && r.email && (
                          <Button size="sm" variant="outline" className="flex-1 sm:flex-none" asChild>
                            <a href={buildMailto(r)} aria-label={`Email reminder to ${r.name}`}>
                              <Send className="size-4" />
                              <span>Remind</span>
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>

                    {isOpen && canExpand && (
                      <div className="mt-4 rounded-lg border bg-muted/30 p-3 sm:ml-12">
                        <p className="text-xs font-medium text-muted-foreground">
                          Waiting for {r.missingSessions.length}{" "}
                          {r.missingSessions.length === 1 ? "response" : "responses"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {r.missingSessions.map((s) => {
                            const f = formatDateDisplay(s.date);
                            return (
                              <Badge
                                key={s.id}
                                variant="outline"
                                className="bg-background text-[11px] font-normal"
                              >
                                {f.dayAbbr} {f.monthDay} &middot; {s.startTime}–
                                {s.endTime}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
        {incompleteWithoutEmail > 0 && (
          <div className="flex items-start gap-2 border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:px-6">
            <Mail className="mt-0.5 size-3.5 shrink-0" />
            <p>
              {incompleteWithoutEmail} incomplete staff member
              {incompleteWithoutEmail === 1 ? " has" : "s have"} no email address
              on file. Add one from the Staff page to send reminders.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResponseSummary({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof CheckCircle2;
  tone: "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-lg border bg-background p-3 last:col-span-2 sm:last:col-span-1">
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium",
          tone === "success" && "text-emerald-700 dark:text-emerald-300",
          tone === "warning" && "text-amber-700 dark:text-amber-300",
          tone === "danger" && "text-red-700 dark:text-red-300"
        )}
      >
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function initialsForName(name: string): string {
  const [lastName, firstName] = name.split(",").map((part) => part.trim());
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

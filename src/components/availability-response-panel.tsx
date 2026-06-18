"use client";

import { Fragment, useMemo, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Mail,
  CheckCircle2,
  CircleSlash,
  Clock,
} from "lucide-react";
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
      <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
        <CheckCircle2 className="h-3 w-3" />
        Complete
      </Badge>
    );
  }
  if (status === "partial") {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100">
        <Clock className="h-3 w-3" />
        Partial
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-100">
      <CircleSlash className="h-3 w-3" />
      No response
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
  const totalStaff = responses.length;

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
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Response Status
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {totalStaff === 0
              ? "No staff on the roster yet."
              : `${fullyResponded} of ${totalStaff} staff have submitted availability for all ${sessions.length} session${sessions.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIncompleteOnly((v) => !v)}
          >
            {incompleteOnly ? "Show all" : "Show only incomplete"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            This schedule has no sessions yet.
          </p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {incompleteOnly
              ? "Everyone has submitted their availability."
              : "No staff on the roster."}
          </p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-center">Responded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Chase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => {
                  const isOpen = expanded.has(r.id);
                  const canExpand = r.missingSessions.length > 0;
                  return (
                    <Fragment key={r.id}>
                      <TableRow
                        className={cn(canExpand && "cursor-pointer")}
                        onClick={() => canExpand && toggleExpanded(r.id)}
                      >
                        <TableCell className="align-middle">
                          {canExpand && (
                            <ChevronRight
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform",
                                isOpen && "rotate-90"
                              )}
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{r.name}</span>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0"
                            >
                              {ROLE_ABBR[r.role] ?? "?"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          <span
                            className={cn(
                              "font-medium",
                              r.status === "complete"
                                ? "text-green-600"
                                : r.status === "none"
                                  ? "text-red-600"
                                  : "text-yellow-700"
                            )}
                          >
                            {r.respondedCount}/{r.totalSessions}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusPill status={r.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.email ? (
                            r.email
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground"
                            >
                              No email
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.status !== "complete" && r.email && (
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <a href={buildMailto(r)}>
                                <Mail className="h-4 w-4 mr-1" />
                                Email
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {isOpen && canExpand && (
                        <TableRow className="bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={5}>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Missing responses ({r.missingSessions.length}):
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {r.missingSessions.map((s) => {
                                const f = formatDateDisplay(s.date);
                                return (
                                  <Badge
                                    key={s.id}
                                    variant="outline"
                                    className="text-[11px] font-normal"
                                  >
                                    {f.dayAbbr} {f.monthDay} &middot; {s.startTime}-
                                    {s.endTime}
                                  </Badge>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {incompleteWithoutEmail > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            {incompleteWithoutEmail} incomplete staff member
            {incompleteWithoutEmail === 1 ? " has" : "s have"} no email on file and
            cannot be chased by email. Add an account on the Staff page.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

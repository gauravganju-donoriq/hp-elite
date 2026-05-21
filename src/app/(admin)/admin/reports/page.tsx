"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScheduling } from "@/lib/context";
import type {
  Report,
  ReportPeriodType,
  ReportScope,
  ReportSummary,
} from "@/lib/types";

function formatDateDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function periodLabel(t: ReportPeriodType): string {
  return t === "weekly" ? "Weekly" : "Monthly";
}

function scopeLabel(s: ReportScope): string {
  return s === "breakdown" ? "Full breakdown" : "Single period";
}

export default function ReportsPage() {
  const { schedules, loading: schedulesLoading } = useScheduling();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [scheduleId, setScheduleId] = useState<string>("");
  const [periodType, setPeriodType] = useState<ReportPeriodType>("weekly");
  const [scope, setScope] = useState<ReportScope>("breakdown");
  const [periodAnchor, setPeriodAnchor] = useState<string>("");

  const selectedSchedule = useMemo(
    () => schedules.find((s) => s.id === scheduleId),
    [schedules, scheduleId]
  );

  useEffect(() => {
    if (!scheduleId && schedules.length > 0) {
      setScheduleId(schedules[0].id);
    }
  }, [schedules, scheduleId]);

  useEffect(() => {
    if (scope === "single" && !periodAnchor && selectedSchedule) {
      setPeriodAnchor(selectedSchedule.startDate);
    }
  }, [scope, periodAnchor, selectedSchedule]);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await fetch("/api/admin/reports");
      if (!res.ok) throw new Error("Failed to load reports");
      const data = (await res.json()) as ReportSummary[];
      setReports(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load reports."
      );
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  async function handleGenerate() {
    if (!scheduleId) {
      toast.error("Pick a schedule to report on.");
      return;
    }
    if (scope === "single" && !periodAnchor) {
      toast.error("Pick a date inside the period you want to report on.");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId,
          periodType,
          scope,
          periodAnchor: scope === "single" ? periodAnchor : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate report");
      }
      const saved = (await res.json()) as Report;
      const summary: ReportSummary = {
        id: saved.id,
        name: saved.name,
        scheduleId: saved.scheduleId,
        scheduleName: saved.scheduleName,
        periodType: saved.periodType,
        scope: saved.scope,
        periodStart: saved.periodStart,
        periodEnd: saved.periodEnd,
        generatedAt: saved.generatedAt,
      };
      setReports((prev) => [summary, ...prev]);
      toast.success("Report generated.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate report."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(id: string) {
    setDownloadingId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`);
      if (!res.ok) throw new Error("Failed to load report");
      const report = (await res.json()) as Report;
      const { generateReportPdf } = await import("@/lib/report-pdf");
      generateReportPdf(report);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to download PDF."
      );
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(id: string) {
    const report = reports.find((r) => r.id === id);
    if (!report) return;
    if (!confirm(`Delete report "${report.name}"?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete report");
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast.success("Report deleted.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete report."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate hours-logged reports from assigned session slots.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Generate new report
          </CardTitle>
          <CardDescription>
            Pick a schedule, choose weekly or monthly grouping, and generate a
            report of hours each staff member is assigned for.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="report-schedule">Schedule</Label>
              <Select
                value={scheduleId}
                onValueChange={(v) => {
                  setScheduleId(v);
                  const schedule = schedules.find((s) => s.id === v);
                  if (schedule) setPeriodAnchor(schedule.startDate);
                }}
                disabled={schedulesLoading || schedules.length === 0}
              >
                <SelectTrigger id="report-schedule" className="w-full">
                  <SelectValue
                    placeholder={
                      schedules.length === 0 ? "No schedules yet" : "Pick one"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {schedules.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({formatDateDisplay(s.startDate)} -{" "}
                      {formatDateDisplay(s.endDate)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-period">Period type</Label>
              <Select
                value={periodType}
                onValueChange={(v) => setPeriodType(v as ReportPeriodType)}
              >
                <SelectTrigger id="report-period" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-scope">Scope</Label>
              <Select
                value={scope}
                onValueChange={(v) => setScope(v as ReportScope)}
              >
                <SelectTrigger id="report-scope" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakdown">
                    Full breakdown across schedule
                  </SelectItem>
                  <SelectItem value="single">
                    Single {periodType === "weekly" ? "week" : "month"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scope === "single" && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="report-anchor">
                  Date inside target{" "}
                  {periodType === "weekly" ? "week" : "month"}
                </Label>
                <Input
                  id="report-anchor"
                  type="date"
                  value={periodAnchor}
                  min={selectedSchedule?.startDate}
                  max={selectedSchedule?.endDate}
                  onChange={(e) => setPeriodAnchor(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {periodType === "weekly"
                    ? "The report covers the Monday-Sunday week containing this date."
                    : "The report covers the full calendar month containing this date."}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              onClick={handleGenerate}
              disabled={generating || !scheduleId}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Previously generated reports
          </CardTitle>
          <CardDescription>
            Download any report as a PDF or remove one you no longer need.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {reportsLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading reports...
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <h3 className="text-sm font-semibold">No reports yet</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Generate your first report above.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="w-[180px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <span className="text-sm">{r.scheduleName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {periodLabel(r.periodType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{scopeLabel(r.scope)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateDisplay(r.periodStart)} -{" "}
                      {formatDateDisplay(r.periodEnd)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(r.generatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(r.id)}
                          disabled={downloadingId === r.id}
                        >
                          {downloadingId === r.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5 mr-1" />
                          )}
                          PDF
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                        >
                          {deletingId === r.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarRange,
  Clock3,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreHorizontal,
  Receipt,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { EmptyState, LoadingState } from "@/components/states";
import { cn } from "@/lib/utils";
import { useScheduling } from "@/lib/context";
import type {
  Report,
  ReportKind,
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

function formatDateShort(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
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

function formatDateTimeCompact(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
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

function kindLabel(k: ReportKind): string {
  return k === "payroll" ? "Payroll" : "Hours";
}

function fmtHrs(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  return String(Math.round(n * 100) / 100);
}

type HistoryFilter = "all" | ReportKind;

const REPORT_TYPES: {
  value: ReportKind;
  title: string;
  description: string;
  icon: typeof Wallet;
}[] = [
  {
    value: "payroll",
    title: "Payroll",
    description: "Per-day system hours vs submitted hours, with editable notes.",
    icon: Wallet,
  },
  {
    value: "hours",
    title: "Hours",
    description: "Weekly or monthly assigned-hours breakdown by staff.",
    icon: Clock3,
  },
];

export default function ReportsPage() {
  const { schedules, loading: schedulesLoading } = useScheduling();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [csvId, setCsvId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");

  const [scheduleId, setScheduleId] = useState<string>("");
  const [kind, setKind] = useState<ReportKind>("payroll");
  const [periodType, setPeriodType] = useState<ReportPeriodType>("weekly");
  const [scope, setScope] = useState<ReportScope>("breakdown");
  const [periodAnchor, setPeriodAnchor] = useState<string>("");
  const [rangeStart, setRangeStart] = useState<string>("");
  const [rangeEnd, setRangeEnd] = useState<string>("");

  const [viewReport, setViewReport] = useState<Report | null>(null);
  const [viewLoadingId, setViewLoadingId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState(false);

  const selectedSchedule = useMemo(
    () => schedules.find((s) => s.id === scheduleId),
    [schedules, scheduleId]
  );

  const payrollCount = useMemo(
    () => reports.filter((r) => r.kind === "payroll").length,
    [reports]
  );
  const hoursCount = useMemo(
    () => reports.filter((r) => r.kind === "hours").length,
    [reports]
  );
  const latestReport = reports[0] ?? null;

  const filteredReports = useMemo(() => {
    if (historyFilter === "all") return reports;
    return reports.filter((r) => r.kind === historyFilter);
  }, [reports, historyFilter]);

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

  useEffect(() => {
    if (selectedSchedule) {
      if (!rangeStart) setRangeStart(selectedSchedule.startDate);
      if (!rangeEnd) setRangeEnd(selectedSchedule.endDate);
    }
  }, [selectedSchedule, rangeStart, rangeEnd]);

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
    if (kind === "payroll") {
      if (!rangeStart || !rangeEnd) {
        toast.error("Pick a start and end date for the payroll period.");
        return;
      }
      if (rangeStart > rangeEnd) {
        toast.error("The start date must be on or before the end date.");
        return;
      }
    } else if (scope === "single" && !periodAnchor) {
      toast.error("Pick a date inside the period you want to report on.");
      return;
    }

    setGenerating(true);
    try {
      const body =
        kind === "payroll"
          ? { scheduleId, kind, rangeStart, rangeEnd }
          : {
              scheduleId,
              kind,
              periodType,
              scope,
              periodAnchor: scope === "single" ? periodAnchor : undefined,
            };
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to generate report");
      }
      const saved = (await res.json()) as Report;
      const summary: ReportSummary = {
        id: saved.id,
        name: saved.name,
        scheduleId: saved.scheduleId,
        scheduleName: saved.scheduleName,
        kind: saved.kind,
        periodType: saved.periodType,
        scope: saved.scope,
        periodStart: saved.periodStart,
        periodEnd: saved.periodEnd,
        generatedAt: saved.generatedAt,
      };
      setReports((prev) => [summary, ...prev]);
      setHistoryFilter("all");
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

  async function handleExportCsv(id: string) {
    setCsvId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`);
      if (!res.ok) throw new Error("Failed to load report");
      const report = (await res.json()) as Report;
      const { generateReportCsv } = await import("@/lib/report-csv");
      generateReportCsv(report);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export CSV.");
    } finally {
      setCsvId(null);
    }
  }

  async function handleView(id: string) {
    setViewLoadingId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`);
      if (!res.ok) throw new Error("Failed to load report");
      const report = (await res.json()) as Report;
      const drafts: Record<string, string> = {};
      for (const row of report.payload.rows) {
        drafts[row.staffId] = row.notes ?? "";
      }
      setNoteDrafts(drafts);
      setViewReport(report);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open report.");
    } finally {
      setViewLoadingId(null);
    }
  }

  async function handleSaveNotes() {
    if (!viewReport) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/admin/reports/${viewReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notesByStaffId: noteDrafts }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to save notes");
      }
      const updated = (await res.json()) as Report;
      setViewReport(updated);
      toast.success("Notes saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save notes.");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleExportCurrent(mode: "csv" | "pdf") {
    if (!viewReport) return;
    if (mode === "csv") {
      const { generateReportCsv } = await import("@/lib/report-csv");
      generateReportCsv(viewReport);
    } else {
      const { generateReportPdf } = await import("@/lib/report-pdf");
      generateReportPdf(viewReport);
    }
  }

  async function confirmDelete() {
    const id = deleteTargetId;
    if (!id) return;
    setDeleteTargetId(null);
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

  const deleteTarget = deleteTargetId
    ? reports.find((r) => r.id === deleteTargetId)
    : null;

  function isBusy(id: string) {
    return (
      viewLoadingId === id ||
      csvId === id ||
      downloadingId === id ||
      deletingId === id
    );
  }

  function renderPrimaryActions(r: ReportSummary) {
    const busy = isBusy(r.id);
    return (
      <div className="flex items-center justify-end gap-1.5">
        {r.kind === "payroll" && (
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="View report"
            title="View report"
            onClick={() => handleView(r.id)}
            disabled={busy}
          >
            {viewLoadingId === r.id ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </Button>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="More report actions"
              disabled={busy}
            >
              {busy && !viewLoadingId && !csvId && !downloadingId ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <MoreHorizontal className="size-4" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-1">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-accent disabled:opacity-50"
              onClick={() => handleExportCsv(r.id)}
              disabled={csvId === r.id}
            >
              <FileSpreadsheet className="size-4 text-muted-foreground" />
              Download CSV
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-accent disabled:opacity-50"
              onClick={() => handleDownload(r.id)}
              disabled={downloadingId === r.id}
            >
              <Download className="size-4 text-muted-foreground" />
              Download PDF
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
              onClick={() => setDeleteTargetId(r.id)}
              disabled={deletingId === r.id}
            >
              <Trash2 className="size-4" />
              Delete report
            </button>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate payroll and hours reports from assigned session slots, then export CSV or PDF."
      />

      {!reportsLoading && reports.length > 0 && (
        <div className="grid overflow-hidden rounded-xl border bg-card shadow-sm sm:grid-cols-3 sm:divide-x">
          <OverviewStat
            icon={FileText}
            label="Total reports"
            value={reports.length}
            detail={
              latestReport
                ? `Latest ${formatDateTimeCompact(latestReport.generatedAt)}`
                : "Saved exports"
            }
            tone="brand"
          />
          <OverviewStat
            icon={Wallet}
            label="Payroll"
            value={payrollCount}
            detail="Day-by-day reconciliations"
          />
          <OverviewStat
            icon={Clock3}
            label="Hours"
            value={hoursCount}
            detail="Weekly / monthly breakdowns"
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:items-start">
        {/* Generate panel */}
        <section className="overflow-hidden rounded-xl border bg-card shadow-sm xl:sticky xl:top-4">
          <div className="border-b bg-muted/30 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold tracking-tight">Generate report</h2>
                <p className="text-sm text-muted-foreground">
                  Choose a type, schedule, and period.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-5">
            <div className="space-y-2">
              <Label>Report type</Label>
              <div className="grid gap-2">
                {REPORT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const selected = kind === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setKind(type.value)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "hover:bg-accent/50"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                          selected
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {type.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {type.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-schedule">Schedule</Label>
              <Select
                value={scheduleId}
                onValueChange={(v) => {
                  setScheduleId(v);
                  const schedule = schedules.find((s) => s.id === v);
                  if (schedule) {
                    setPeriodAnchor(schedule.startDate);
                    setRangeStart(schedule.startDate);
                    setRangeEnd(schedule.endDate);
                  }
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
                      {s.name} ({formatDateDisplay(s.startDate)} –{" "}
                      {formatDateDisplay(s.endDate)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSchedule && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarRange className="size-3.5 shrink-0" />
                  {formatDateDisplay(selectedSchedule.startDate)} –{" "}
                  {formatDateDisplay(selectedSchedule.endDate)}
                </p>
              )}
            </div>

            {kind === "payroll" ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="report-range-start">Start date</Label>
                  <Input
                    id="report-range-start"
                    type="date"
                    value={rangeStart}
                    min={selectedSchedule?.startDate}
                    max={selectedSchedule?.endDate}
                    onChange={(e) => setRangeStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-range-end">End date</Label>
                  <Input
                    id="report-range-end"
                    type="date"
                    value={rangeEnd}
                    min={rangeStart || selectedSchedule?.startDate}
                    max={selectedSchedule?.endDate}
                    onChange={(e) => setRangeEnd(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2 xl:col-span-1">
                  One column per training day, plus submitted hours, difference,
                  and notes.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="space-y-2">
                    <Label htmlFor="report-period">Period type</Label>
                    <Select
                      value={periodType}
                      onValueChange={(v) =>
                        setPeriodType(v as ReportPeriodType)
                      }
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
                          Full schedule breakdown
                        </SelectItem>
                        <SelectItem value="single">
                          Single{" "}
                          {periodType === "weekly" ? "week" : "month"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {scope === "single" && (
                  <div className="space-y-2">
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
                        ? "Covers the Monday–Sunday week containing this date."
                        : "Covers the full calendar month containing this date."}
                    </p>
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={generating || !scheduleId}
            >
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate report
                </>
              )}
            </Button>
          </div>
        </section>

        {/* History */}
        <section className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold tracking-tight">
                    Report history
                  </h2>
                  {!reportsLoading && (
                    <Badge
                      variant="secondary"
                      className="rounded-full tabular-nums"
                    >
                      {filteredReports.length}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  View, export, or remove saved reports.
                </p>
              </div>
            </div>

            {!reportsLoading && reports.length > 0 && (
              <Tabs
                value={historyFilter}
                onValueChange={(v) => setHistoryFilter(v as HistoryFilter)}
              >
              <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                  <TabsTrigger value="all" className="px-2 text-xs sm:text-sm">All</TabsTrigger>
                  <TabsTrigger value="payroll" className="px-2 text-xs sm:text-sm">Payroll</TabsTrigger>
                  <TabsTrigger value="hours" className="px-2 text-xs sm:text-sm">Hours</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {reportsLoading ? (
              <LoadingState label="Loading reports..." />
            ) : reports.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={FileText}
                  title="No reports yet"
                  description="Use the generator to create your first payroll or hours report."
                />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={FileText}
                  title={`No ${historyFilter} reports`}
                  description="Try another filter, or generate a new report of this type."
                />
              </div>
            ) : (
              <>
                <div className="divide-y lg:hidden">
                  {filteredReports.map((r) => (
                    <div key={r.id} className="space-y-3 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium leading-snug">{r.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {r.scheduleName}
                          </p>
                        </div>
                        <KindBadge kind={r.kind} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {r.kind === "payroll"
                            ? "Per-day"
                            : `${periodLabel(r.periodType)} · ${scopeLabel(r.scope)}`}
                        </span>
                        <span>
                          {formatDateDisplay(r.periodStart)} –{" "}
                          {formatDateDisplay(r.periodEnd)}
                        </span>
                        <span>{formatDateTime(r.generatedAt)}</span>
                      </div>
                      {renderPrimaryActions(r)}
                    </div>
                  ))}
                </div>

                <div className="hidden lg:block">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-5">Report</TableHead>
                        <TableHead className="w-[100px]">Type</TableHead>
                        <TableHead className="w-[150px]">Range</TableHead>
                        <TableHead className="w-[130px]">Generated</TableHead>
                        <TableHead className="w-[92px] pr-5 text-right">
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="max-w-0 whitespace-normal pl-5">
                            <p
                              className="truncate font-medium"
                              title={r.name}
                            >
                              {r.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {r.scheduleName}
                              {r.kind === "payroll"
                                ? " · Per-day"
                                : ` · ${periodLabel(r.periodType)} · ${scopeLabel(r.scope)}`}
                            </p>
                          </TableCell>
                          <TableCell>
                            <KindBadge kind={r.kind} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {formatDateShort(r.periodStart)} –{" "}
                            {formatDateShort(r.periodEnd)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {formatDateTimeCompact(r.generatedAt)}
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            {renderPrimaryActions(r)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <Dialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete report?</DialogTitle>
            <DialogDescription>
              {deleteTarget ? (
                <>
                  <span className="font-medium text-foreground">
                    {deleteTarget.name}
                  </span>{" "}
                  will be permanently removed. This cannot be undone.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={viewReport !== null}
        onOpenChange={(open) => {
          if (!open) setViewReport(null);
        }}
      >
        <DialogContent className="flex max-h-[92dvh] max-w-[calc(100vw-1rem)] flex-col overflow-hidden sm:max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>{viewReport?.name}</DialogTitle>
            <DialogDescription>
              System hours per day vs. staff-submitted hours. Edit notes and
              export when ready.
            </DialogDescription>
          </DialogHeader>

          {viewReport && (
            <>
              <div className="scroll-fade-x no-scrollbar flex-1 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10 bg-background">
                        Staff
                      </TableHead>
                      {viewReport.payload.buckets.map((b, i) => (
                        <TableHead
                          key={i}
                          className="min-w-[70px] text-center"
                        >
                          <div className="text-xs font-medium">
                            {b.dayOfWeek}
                          </div>
                          <div className="text-[10px] font-normal text-muted-foreground">
                            {b.timeWindow}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Submitted</TableHead>
                      <TableHead className="text-center">Diff</TableHead>
                      <TableHead className="min-w-[220px]">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewReport.payload.rows.map((row) => {
                      const diff = row.difference ?? row.total;
                      return (
                        <TableRow key={row.staffId}>
                          <TableCell className="sticky left-0 z-10 whitespace-nowrap bg-background font-medium">
                            {row.lastName}, {row.firstName}
                          </TableCell>
                          {row.buckets.map((h, i) => (
                            <TableCell
                              key={i}
                              className="text-center text-sm tabular-nums"
                            >
                              {h > 0 ? fmtHrs(h) : ""}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-semibold tabular-nums">
                            {fmtHrs(row.total)}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {row.submitted === null ||
                            row.submitted === undefined ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              fmtHrs(row.submitted)
                            )}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-center font-medium tabular-nums",
                              diff > 0.001 && "text-red-600",
                              diff < -0.001 && "text-yellow-600"
                            )}
                          >
                            {fmtHrs(diff)}
                          </TableCell>
                          <TableCell>
                            <Textarea
                              value={noteDrafts[row.staffId] ?? ""}
                              onChange={(e) =>
                                setNoteDrafts((prev) => ({
                                  ...prev,
                                  [row.staffId]: e.target.value,
                                }))
                              }
                              rows={1}
                              className="min-h-9 text-sm"
                              placeholder="Add a note"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => handleExportCurrent("pdf")}
                >
                  <Download className="size-3.5" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => handleExportCurrent("csv")}
                >
                  <FileSpreadsheet className="size-3.5" />
                  Export CSV
                </Button>
                <Button
                  size="sm"
                  className="col-span-2 w-full sm:w-auto"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                >
                  {savingNotes ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save notes"
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KindBadge({ kind }: { kind: ReportKind }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 font-medium",
        kind === "payroll"
          ? "border-primary/20 bg-primary/10 text-primary"
          : "border-border bg-muted text-muted-foreground"
      )}
    >
      {kindLabel(kind)}
    </Badge>
  );
}

function OverviewStat({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  detail: string;
  tone?: "default" | "brand";
}) {
  return (
    <div className="flex items-center gap-2.5 border-b p-3 last:border-b-0 sm:gap-3 sm:border-b-0 sm:p-5">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-10",
          tone === "brand"
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-4 sm:size-5" />
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold tabular-nums sm:text-2xl">{value}</span>
          <span className="truncate text-xs font-medium sm:text-sm">{label}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

import type { Report, StaffRole } from "./types";

const ROLE_LABELS: Record<StaffRole, string> = {
  lead: "Lead",
  experience: "Experience",
  junior: "Junior",
  trial: "Trial",
};

function fmtHours(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function escapeCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(matrix: (string | number | null | undefined)[][]): string {
  return matrix.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

function download(filename: string, csv: string): void {
  // Prepend BOM so Excel opens UTF-8 correctly.
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeName(name: string): string {
  return name.replace(/[^a-z0-9-_ ]/gi, "_");
}

// Payroll CSV mirrors the "Spring Week 5-6" spreadsheet: a meta header block
// (Day / Date / Time / Location / Required Staff), a column-pair per training
// day (assignment window + hours), then Total / Submitted / Difference / Notes.
export function generatePayrollCsv(report: Report): void {
  const { buckets, rows, totalHours } = report.payload;

  const summaryCols = 4; // Total, Submitted, Difference, Notes
  const trailingBlanks = new Array(summaryCols).fill("");

  const metaRow = (label: string, pick: (i: number) => string | number) => [
    label,
    "",
    ...buckets.flatMap((_, i) => [pick(i), ""]),
    ...trailingBlanks,
  ];

  const matrix: (string | number | null | undefined)[][] = [];

  matrix.push([report.name]);
  matrix.push([`Schedule: ${report.scheduleName}`]);
  matrix.push([
    `Range: ${fmtDate(report.periodStart)} to ${fmtDate(report.periodEnd)}`,
  ]);
  matrix.push([]);

  matrix.push(metaRow("Day", (i) => buckets[i].dayOfWeek ?? ""));
  matrix.push(metaRow("Date", (i) => fmtDate(buckets[i].date)));
  matrix.push(metaRow("Time", (i) => buckets[i].timeWindow ?? ""));
  matrix.push(metaRow("Location", (i) => buckets[i].location ?? ""));
  matrix.push(
    metaRow("Required Staff", (i) => buckets[i].requiredStaff ?? "")
  );

  matrix.push([
    "Last",
    "First",
    ...buckets.flatMap((b) => [fmtDate(b.date), "Hrs"]),
    "Total",
    "Submitted",
    "Difference",
    "Notes",
  ]);

  for (const row of rows) {
    const cells: (string | number | null | undefined)[] = [
      row.lastName ?? "",
      row.firstName ?? row.staffName,
    ];
    for (let i = 0; i < buckets.length; i++) {
      cells.push(row.windows?.[i] ?? "");
      cells.push(fmtHours(row.buckets[i] ?? 0));
    }
    cells.push(fmtHours(row.total));
    cells.push(
      row.submitted === null || row.submitted === undefined
        ? ""
        : fmtHours(row.submitted)
    );
    cells.push(fmtHours(row.difference ?? row.total));
    cells.push(row.notes ?? "");
    matrix.push(cells);
  }

  matrix.push([
    "",
    "Grand total",
    ...buckets.flatMap(() => ["", ""]),
    fmtHours(totalHours),
    "",
    "",
    "",
  ]);

  download(`${safeName(report.name)}.csv`, toCsv(matrix));
}

// Simple CSV for the weekly/monthly hours-breakdown reports.
export function generateBreakdownCsv(report: Report): void {
  const { buckets, rows, totalHours } = report.payload;

  const matrix: (string | number | null | undefined)[][] = [];
  matrix.push([report.name]);
  matrix.push([`Schedule: ${report.scheduleName}`]);
  matrix.push([
    `Range: ${fmtDate(report.periodStart)} to ${fmtDate(report.periodEnd)}`,
  ]);
  matrix.push([]);

  matrix.push(["Staff", "Role", ...buckets.map((b) => b.label), "Total"]);

  for (const row of rows) {
    matrix.push([
      row.staffName,
      ROLE_LABELS[row.role],
      ...row.buckets.map((h) => fmtHours(h)),
      fmtHours(row.total),
    ]);
  }

  matrix.push([
    "Grand total",
    "",
    ...buckets.map(() => ""),
    fmtHours(totalHours),
  ]);

  download(`${safeName(report.name)}.csv`, toCsv(matrix));
}

// Routes a report to the correct CSV generator by kind.
export function generateReportCsv(report: Report): void {
  if (report.kind === "payroll") {
    generatePayrollCsv(report);
  } else {
    generateBreakdownCsv(report);
  }
}

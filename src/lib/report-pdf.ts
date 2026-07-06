import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Report, StaffRole } from "./types";

const ROLE_LABELS: Record<StaffRole, string> = {
  lead: "Lead",
  experience: "Experience",
  junior: "Junior",
  trial: "Trial",
};

function formatHours(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function formatDateDisplay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function generateReportPdf(report: Report): void {
  const bucketCount = report.payload.buckets.length;
  const orientation = bucketCount > 6 ? "landscape" : "portrait";

  const doc = new jsPDF({ orientation, unit: "pt", format: "letter" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(report.name, marginX, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);

  const periodLabel =
    report.periodType === "weekly" ? "Weekly" : "Monthly";
  const scopeLabel =
    report.scope === "breakdown" ? "Full breakdown" : "Single period";

  const metaLines = [
    `Schedule: ${report.scheduleName}`,
    `Type: ${periodLabel} - ${scopeLabel}`,
    `Range: ${formatDateDisplay(report.periodStart)} to ${formatDateDisplay(report.periodEnd)}`,
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
  ];

  let y = 70;
  for (const line of metaLines) {
    doc.text(line, marginX, y);
    y += 14;
  }

  doc.setTextColor(0);

  const isPayroll = report.kind === "payroll";

  const head = [
    isPayroll
      ? [
          "Staff",
          ...report.payload.buckets.map((b) => b.label),
          "Total",
          "Submitted",
          "Diff",
          "Notes",
        ]
      : [
          "Staff",
          "Role",
          ...report.payload.buckets.map((b) => b.label),
          "Total",
        ],
  ];

  const body = report.payload.rows.map((row) =>
    isPayroll
      ? [
          row.lastName && row.firstName
            ? `${row.lastName}, ${row.firstName}`
            : row.staffName,
          ...row.buckets.map((h) => (h > 0 ? formatHours(h) : "")),
          formatHours(row.total),
          row.submitted === null || row.submitted === undefined
            ? ""
            : formatHours(row.submitted),
          formatHours(row.difference ?? row.total),
          row.notes ?? "",
        ]
      : [
          row.staffName,
          ROLE_LABELS[row.role],
          ...row.buckets.map((h) => formatHours(h)),
          formatHours(row.total),
        ]
  );

  const leadCols = isPayroll ? 1 : 2;

  const foot =
    report.payload.rows.length > 0
      ? [
          [
            {
              content: "Grand total",
              colSpan: leadCols + bucketCount,
              styles: { halign: "right" as const, fontStyle: "bold" as const },
            },
            {
              content: formatHours(report.payload.totalHours),
              styles: { fontStyle: "bold" as const },
            },
            ...(isPayroll
              ? [
                  { content: "" },
                  { content: "" },
                  { content: "" },
                ]
              : []),
          ],
        ]
      : undefined;

  autoTable(doc, {
    head,
    body,
    foot,
    startY: y + 6,
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 249] },
    columnStyles: {
      [leadCols + bucketCount]: { fontStyle: "bold" },
    },
    theme: "grid",
  });

  if (report.payload.rows.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.text(
      "No staff were assigned to any sessions in this period.",
      marginX,
      y + 40
    );
    doc.setTextColor(0);
  }

  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(9);
  doc.setTextColor(120);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - marginX,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" }
    );
  }

  const safeName = report.name.replace(/[^a-z0-9-_ ]/gi, "_");
  doc.save(`${safeName}.pdf`);
}

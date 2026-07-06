import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import {
  createReport,
  getAllReports,
  getAllSlots,
  getAllStaff,
  getScheduleById,
  getSubmissionsInRange,
} from "@/lib/queries";
import {
  computeReport,
  computePayrollReport,
  formatReportName,
  formatPayrollReportName,
} from "@/lib/reports";
import type { ReportKind, ReportPeriodType, ReportScope } from "@/lib/types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const reports = await getAllReports();
  return NextResponse.json(reports);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const body = (await request.json()) as {
    scheduleId?: string;
    kind?: ReportKind;
    periodType?: ReportPeriodType;
    scope?: ReportScope;
    periodAnchor?: string;
    rangeStart?: string;
    rangeEnd?: string;
    name?: string;
  };

  const { scheduleId, kind = "hours", name } = body;

  if (!scheduleId) {
    return NextResponse.json(
      { error: "scheduleId is required" },
      { status: 400 }
    );
  }
  if (kind !== "hours" && kind !== "payroll") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const schedule = await getScheduleById(scheduleId);
  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const id = `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (kind === "payroll") {
    const { rangeStart, rangeEnd } = body;
    if (!rangeStart || !ISO_DATE.test(rangeStart) || !rangeEnd || !ISO_DATE.test(rangeEnd)) {
      return NextResponse.json(
        { error: "rangeStart and rangeEnd (YYYY-MM-DD) are required for payroll reports" },
        { status: 400 }
      );
    }
    if (rangeStart > rangeEnd) {
      return NextResponse.json(
        { error: "rangeStart must be on or before rangeEnd" },
        { status: 400 }
      );
    }

    const [staff, slots, submissions] = await Promise.all([
      getAllStaff(),
      getAllSlots(),
      getSubmissionsInRange(rangeStart, rangeEnd),
    ]);

    const { payload, periodStart, periodEnd } = computePayrollReport({
      schedule,
      sessions: schedule.sessions,
      slots,
      staff,
      submissions,
      rangeStart,
      rangeEnd,
    });

    const reportName =
      name?.trim() ||
      formatPayrollReportName(schedule.name, periodStart, periodEnd);

    const saved = await createReport({
      id,
      name: reportName,
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      kind: "payroll",
      periodType: "weekly",
      scope: "breakdown",
      periodStart,
      periodEnd,
      payload,
    });

    return NextResponse.json(saved, { status: 201 });
  }

  const { periodType, scope, periodAnchor } = body;

  if (!periodType || !scope) {
    return NextResponse.json(
      { error: "periodType and scope are required" },
      { status: 400 }
    );
  }
  if (periodType !== "weekly" && periodType !== "monthly") {
    return NextResponse.json({ error: "Invalid periodType" }, { status: 400 });
  }
  if (scope !== "breakdown" && scope !== "single") {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }
  if (scope === "single" && !periodAnchor) {
    return NextResponse.json(
      { error: "periodAnchor is required when scope is 'single'" },
      { status: 400 }
    );
  }

  const [staff, slots] = await Promise.all([getAllStaff(), getAllSlots()]);

  const { payload, periodStart, periodEnd } = computeReport({
    schedule,
    sessions: schedule.sessions,
    slots,
    staff,
    periodType,
    scope,
    periodAnchor,
  });

  const reportName =
    name?.trim() ||
    formatReportName(schedule.name, periodType, scope, periodStart, periodEnd);

  const saved = await createReport({
    id,
    name: reportName,
    scheduleId: schedule.id,
    scheduleName: schedule.name,
    kind: "hours",
    periodType,
    scope,
    periodStart,
    periodEnd,
    payload,
  });

  return NextResponse.json(saved, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import {
  createReport,
  getAllReports,
  getAllSlots,
  getAllStaff,
  getScheduleById,
} from "@/lib/queries";
import { computeReport, formatReportName } from "@/lib/reports";
import type { ReportPeriodType, ReportScope } from "@/lib/types";

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
    periodType?: ReportPeriodType;
    scope?: ReportScope;
    periodAnchor?: string;
    name?: string;
  };

  const { scheduleId, periodType, scope, periodAnchor, name } = body;

  if (!scheduleId || !periodType || !scope) {
    return NextResponse.json(
      { error: "scheduleId, periodType and scope are required" },
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

  const schedule = await getScheduleById(scheduleId);
  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
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

  const id = `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const saved = await createReport({
    id,
    name: reportName,
    scheduleId: schedule.id,
    scheduleName: schedule.name,
    periodType,
    scope,
    periodStart,
    periodEnd,
    payload,
  });

  return NextResponse.json(saved, { status: 201 });
}

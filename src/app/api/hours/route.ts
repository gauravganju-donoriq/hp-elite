import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, isAdmin } from "@/lib/api-auth";
import {
  getStaffByUserId,
  getSubmissionsForStaff,
  getSubmissionsInRange,
  upsertHoursSubmission,
} from "@/lib/queries";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const admin = isAdmin(session);
  const staffId = request.nextUrl.searchParams.get("staffId");
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");

  if (admin) {
    if (staffId) {
      return NextResponse.json(await getSubmissionsForStaff(staffId));
    }
    if (start && end) {
      return NextResponse.json(await getSubmissionsInRange(start, end));
    }
    return NextResponse.json([]);
  }

  const myStaff = await getStaffByUserId(session.user.id);
  if (!myStaff) return NextResponse.json([]);
  return NextResponse.json(await getSubmissionsForStaff(myStaff.id));
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await request.json();
  const { weekStart, weekEnd, submittedHours, notes } = body as {
    weekStart?: string;
    weekEnd?: string;
    submittedHours?: number;
    notes?: string;
  };

  if (!weekStart || !ISO_DATE.test(weekStart)) {
    return NextResponse.json(
      { error: "Valid weekStart (YYYY-MM-DD) is required", field: "weekStart" },
      { status: 400 }
    );
  }
  if (!weekEnd || !ISO_DATE.test(weekEnd)) {
    return NextResponse.json(
      { error: "Valid weekEnd (YYYY-MM-DD) is required", field: "weekEnd" },
      { status: 400 }
    );
  }
  const hours = Number(submittedHours);
  if (!Number.isFinite(hours) || hours < 0 || hours > 168) {
    return NextResponse.json(
      { error: "submittedHours must be between 0 and 168", field: "submittedHours" },
      { status: 400 }
    );
  }

  const myStaff = await getStaffByUserId(session.user.id);
  if (!myStaff) {
    return NextResponse.json(
      { error: "No staff record linked to this account" },
      { status: 403 }
    );
  }

  const saved = await upsertHoursSubmission({
    staffId: myStaff.id,
    weekStart,
    weekEnd,
    submittedHours: hours,
    notes: typeof notes === "string" ? notes : undefined,
  });

  return NextResponse.json(saved, { status: 201 });
}

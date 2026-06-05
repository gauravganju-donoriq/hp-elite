import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import {
  getScheduleById,
  updateSchedule,
  deleteSchedule,
} from "@/lib/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const schedule = await getScheduleById(id);

  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }
  return NextResponse.json(schedule);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { id } = await params;
  const body = await request.json();

  if (body.startDate !== undefined && !ISO_DATE.test(body.startDate)) {
    return NextResponse.json({ error: "Invalid startDate", field: "startDate" }, { status: 400 });
  }
  if (body.endDate !== undefined && !ISO_DATE.test(body.endDate)) {
    return NextResponse.json({ error: "Invalid endDate", field: "endDate" }, { status: 400 });
  }
  if (body.startDate !== undefined || body.endDate !== undefined) {
    const existing = await getScheduleById(id);
    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }
    const startDate = body.startDate ?? existing.startDate;
    const endDate = body.endDate ?? existing.endDate;
    if (startDate > endDate) {
      return NextResponse.json(
        { error: "startDate must be on or before endDate", field: "endDate" },
        { status: 400 }
      );
    }
  }

  const success = await updateSchedule(id, body);

  if (!success) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const updated = await getScheduleById(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { id } = await params;
  const deleted = await deleteSchedule(id);

  if (!deleted) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

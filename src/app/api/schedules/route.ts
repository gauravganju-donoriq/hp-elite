import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { getAllSchedules, createSchedule } from "@/lib/queries";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const schedules = await getAllSchedules();
  return NextResponse.json(schedules);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const body = await request.json();
  const { id, name, description, startDate, endDate } = body;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing or invalid id", field: "id" }, { status: 400 });
  }
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Missing or invalid name", field: "name" }, { status: 400 });
  }
  if (!startDate || !ISO_DATE.test(startDate)) {
    return NextResponse.json({ error: "Invalid startDate (expected YYYY-MM-DD)", field: "startDate" }, { status: 400 });
  }
  if (!endDate || !ISO_DATE.test(endDate)) {
    return NextResponse.json({ error: "Invalid endDate (expected YYYY-MM-DD)", field: "endDate" }, { status: 400 });
  }
  if (startDate > endDate) {
    return NextResponse.json({ error: "startDate must be on or before endDate", field: "endDate" }, { status: 400 });
  }

  const schedule = await createSchedule({ id, name, description, startDate, endDate });
  return NextResponse.json(schedule, { status: 201 });
}

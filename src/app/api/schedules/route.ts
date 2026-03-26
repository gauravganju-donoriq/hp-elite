import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { getAllSchedules, createSchedule } from "@/lib/queries";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const schedules = await getAllSchedules();
  return NextResponse.json(schedules);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const body = await request.json();
  const { id, name, description, startDate, endDate } = body;

  if (!id || !name || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const schedule = await createSchedule({ id, name, description, startDate, endDate });
  return NextResponse.json(schedule, { status: 201 });
}

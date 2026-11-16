import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import {
  getStaffById,
  getUserById,
  getScheduleById,
  getSessionsByScheduleId,
  getAvailabilityByStaff,
} from "@/lib/queries";
import { sendEmail } from "@/lib/email";
import { renderAvailabilityReminder } from "@/lib/emails/availability-reminder";
import { todayISO } from "@/lib/dates";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const body = await request.json().catch(() => ({}));
  const staffId = body?.staffId as string | undefined;
  const scheduleId = body?.scheduleId as string | undefined;

  if (!staffId || !scheduleId) {
    return NextResponse.json(
      { error: "Missing required fields: staffId, scheduleId" },
      { status: 400 }
    );
  }

  const staff = await getStaffById(staffId);
  if (!staff) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }
  if (!staff.userId) {
    return NextResponse.json(
      { error: "Staff member does not have a linked account" },
      { status: 400 }
    );
  }

  const user = await getUserById(staff.userId);
  if (!user?.email) {
    return NextResponse.json(
      { error: "Staff member has no email address on file" },
      { status: 400 }
    );
  }

  const schedule = await getScheduleById(scheduleId);
  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const sessions = await getSessionsByScheduleId(scheduleId);
  const availability = await getAvailabilityByStaff(staffId);
  const respondedSessionIds = new Set(availability.map((a) => a.sessionId));

  const missingSessions = sessions
    .filter((s) => !respondedSessionIds.has(s.id))
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
    )
    .map((s) => ({ date: s.date, startTime: s.startTime, endTime: s.endTime }));

  if (missingSessions.length === 0) {
    return NextResponse.json(
      { error: "This staff member has already responded to every session" },
      { status: 400 }
    );
  }

  const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const { subject, html, text } = renderAvailabilityReminder({
    firstName: staff.firstName || "there",
    scheduleName: schedule.name,
    missingSessions,
    appUrl,
  });

  const { data, error } = await sendEmail({
    to: user.email,
    subject,
    html,
    text,
    idempotencyKey: `availability-reminder/${scheduleId}-${staffId}-${todayISO()}`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data?.id }, { status: 200 });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized } from "@/lib/api-auth";
import { bulkUpsertAvailability, getStaffByUserId } from "@/lib/queries";
import pool from "@/lib/db";

const VALID_STATUSES = new Set(["available", "unavailable", "maybe", "pending"]);

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await request.json();
  const { entries } = body;

  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "entries array is required" }, { status: 400 });
  }

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e || typeof e !== "object") {
      return NextResponse.json({ error: `entries[${i}] invalid` }, { status: 400 });
    }
    if (!e.staffId || typeof e.staffId !== "string") {
      return NextResponse.json({ error: `entries[${i}].staffId missing`, field: "staffId" }, { status: 400 });
    }
    if (!e.sessionId || typeof e.sessionId !== "string") {
      return NextResponse.json({ error: `entries[${i}].sessionId missing`, field: "sessionId" }, { status: 400 });
    }
    if (!e.status || !VALID_STATUSES.has(e.status)) {
      return NextResponse.json({ error: `entries[${i}].status invalid`, field: "status" }, { status: 400 });
    }
  }

  // Reject the whole batch if any sessionId doesn't exist.
  const uniqueSessionIds = Array.from(
    new Set(entries.map((e: { sessionId: string }) => e.sessionId))
  );
  const { rows: foundRows } = await pool.query(
    `SELECT id FROM training_session WHERE id = ANY($1::text[])`,
    [uniqueSessionIds]
  );
  if (foundRows.length !== uniqueSessionIds.length) {
    const found = new Set(foundRows.map((r) => r.id as string));
    const missing = uniqueSessionIds.filter((id) => !found.has(id as string));
    return NextResponse.json(
      { error: "Some sessionIds do not exist", missing },
      { status: 400 }
    );
  }

  const staff = await getStaffByUserId(session.user.id);
  const isAdminUser = session.user.role === "admin";

  const allSameStaff =
    !!staff && entries.every((e: { staffId: string }) => e.staffId === staff.id);

  if (!allSameStaff && !isAdminUser) {
    return NextResponse.json(
      { error: "Cannot set availability for another staff member" },
      { status: 403 }
    );
  }

  await bulkUpsertAvailability(entries);
  return NextResponse.json({ success: true, count: entries.length });
}

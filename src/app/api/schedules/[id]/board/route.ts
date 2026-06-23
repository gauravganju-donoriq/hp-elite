import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized } from "@/lib/api-auth";
import { getScheduleBoard } from "@/lib/queries";

// Read-only composed view of a schedule for the shared board. Any authenticated
// user (admin or staff) may read it; it only exposes display names, never emails.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const board = await getScheduleBoard(id);

  if (!board) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }
  return NextResponse.json(board);
}

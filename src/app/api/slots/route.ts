import { NextResponse } from "next/server";
import { getSession, unauthorized } from "@/lib/api-auth";
import { getAllSlots } from "@/lib/queries";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const slots = await getAllSlots();
  return NextResponse.json(slots);
}

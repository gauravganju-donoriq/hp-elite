import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { autoAssignSession } from "@/lib/queries";
import type { AutoAssignStrategy } from "@/lib/types";

const VALID_STRATEGIES: AutoAssignStrategy[] = ["cheap", "balanced", "expensive"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const requested = (body as { strategy?: unknown }).strategy;
  const strategy: AutoAssignStrategy =
    typeof requested === "string" &&
    (VALID_STRATEGIES as string[]).includes(requested)
      ? (requested as AutoAssignStrategy)
      : "balanced";

  const result = await autoAssignSession(id, strategy);
  return NextResponse.json(result);
}

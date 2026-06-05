import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, isAdmin } from "@/lib/api-auth";
import { getAllClassTypes, createClassType } from "@/lib/queries";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const classTypes = await getAllClassTypes();
  return NextResponse.json(classTypes);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const body = await request.json();
  const { id, label, colorKey, sortOrder } = body ?? {};

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
  }
  if (!label || typeof label !== "string") {
    return NextResponse.json({ error: "Missing or invalid label" }, { status: 400 });
  }
  if (!colorKey || typeof colorKey !== "string") {
    return NextResponse.json({ error: "Missing or invalid colorKey" }, { status: 400 });
  }

  try {
    const classType = await createClassType({
      id: id.trim(),
      label: label.trim(),
      colorKey,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    });
    return NextResponse.json(classType, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create class type";
    if (message.includes("duplicate") || message.includes("unique")) {
      return NextResponse.json(
        { error: "A class type with that id already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

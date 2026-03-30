import { NextRequest, NextResponse } from "next/server";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { getTours, createTour } from "@/lib/tours/queries";

export const runtime = "nodejs";

// GET /api/tours - List tours for the current org
export async function GET(req: NextRequest) {
  try {
    const ctx = await resolveServerOrgContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tours = await getTours(ctx.supabase, { orgId: ctx.org.id });
    return NextResponse.json(tours);
  } catch (err: any) {
    console.error("[GET /api/tours] Error:", err);
    return NextResponse.json({ error: "Failed to fetch tours" }, { status: 500 });
  }
}

// POST /api/tours - Create a new tour
export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveServerOrgContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, description, projectId } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const newTour = await createTour(ctx.supabase, {
      orgId: ctx.org.id,
      createdBy: ctx.user.id,
      title,
      description,
      projectId,
    });

    return NextResponse.json(newTour, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/tours] Error:", err);
    return NextResponse.json({ error: "Failed to create tour" }, { status: 500 });
  }
}

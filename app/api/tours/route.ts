import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, unauthorized } from "@/lib/server/api-response";
import { getTours, createTour } from "@/lib/tours/queries";

export const runtime = "nodejs";

// GET /api/tours - List tours for the current org
export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const tours = await getTours(admin, { orgId });
      return ok(tours);
    } catch (err: any) {
      console.error("[GET /api/tours] Error:", err);
      return serverError("Failed to fetch tours");
    }
  });

// POST /api/tours - Create a new tour
export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const body = await req.json();
      const { title, description, projectId } = body;

      if (!title) {
        return badRequest("Title is required");
      }

      const newTour = await createTour(admin, {
        orgId,
        createdBy: user.id,
        title,
        description,
        projectId,
      });

      return ok(newTour);
    } catch (err: any) {
      console.error("[POST /api/tours] Error:", err);
      return serverError("Failed to create tour");
    }
  });

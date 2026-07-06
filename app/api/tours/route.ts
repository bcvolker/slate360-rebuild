import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, unauthorized } from "@/lib/server/api-response";
import { getTours, createTour } from "@/lib/tours/queries";
import { findOrCreate360LibraryProject } from "@/lib/tours/system-project";
import { isOwnerEmail } from "@/lib/server/beta-access";

export const runtime = "nodejs";

// GET /api/tours - List tours for the current org
export const GET = (req: NextRequest) =>
  withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
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
  withAppAuth("tour_builder", req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const body = await req.json();
      const { title, description } = body;
      let { projectId } = body;

      if (!title) {
        return badRequest("Title is required");
      }

      // Project-less tours (e.g. from the mobile import flow) land in a hidden
      // per-org "360 Library" project so project_tours.project_id (NOT NULL)
      // is always satisfied without forcing the user to pick a project first.
      if (!projectId) {
        projectId = await findOrCreate360LibraryProject(admin, orgId, user.id, {
          isSlateCeo: isOwnerEmail(user.email),
        });
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

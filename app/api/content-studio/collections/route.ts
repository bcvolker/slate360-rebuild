import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, unauthorized } from "@/lib/server/api-response";
import { getCollections, createCollection } from "@/lib/content-studio/queries";

export const runtime = "nodejs";

/** GET /api/content-studio/collections?projectId=xxx */
export const GET = async (req: NextRequest) =>
  withAppAuth("content_studio", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");
    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) return badRequest("projectId is required");

    try {
      const collections = await getCollections(admin, projectId, { orgId });
      return ok(collections);
    } catch (err: unknown) {
      console.error("[GET /api/content-studio/collections]", err);
      return serverError("Failed to fetch collections");
    }
  });

/** POST /api/content-studio/collections */
export const POST = async (req: NextRequest) =>
  withAppAuth("content_studio", req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const body = await req.json();
      const { projectId, title, description } = body as {
        projectId: string;
        title: string;
        description?: string;
      };
      if (!projectId || !title) return badRequest("projectId and title are required");

      const collection = await createCollection(admin, {
        orgId,
        projectId,
        createdBy: user.id,
        title,
        description,
      });
      return ok(collection);
    } catch (err: unknown) {
      console.error("[POST /api/content-studio/collections]", err);
      return serverError("Failed to create collection");
    }
  });

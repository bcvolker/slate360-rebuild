import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { withProjectAuth } from "@/lib/server/api-auth";
import { BUCKET, s3 } from "@/lib/s3";
import { parseEditList } from "@/lib/digital-twin/edit-list-types";
import { projectIncludesCapability } from "@/lib/vnext/scope/read-project-scope";
import { clientMayReadSource } from "@/lib/vnext/release/source-visible";

export const runtime = "nodejs";

type Params = { params: Promise<{ projectId: string; modelId: string }> };

export function GET(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, projectId, user }) => {
    const { modelId } = await ctx.params;
    if (!(await projectIncludesCapability(admin, projectId, "reality"))) {
      return NextResponse.json(null, { status: 404 });
    }
    if (!(await clientMayReadSource(admin, projectId, "reality", modelId, user.email))) {
      return NextResponse.json(null, { status: 404 });
    }

    const { data: model } = await admin
      .from("digital_twin_models")
      .select("storage_key, edit_list, digital_twin_spaces!inner(project_id)")
      .eq("id", modelId)
      .eq("status", "ready")
      .is("deleted_at", null)
      .eq("digital_twin_spaces.project_id", projectId)
      .maybeSingle();

    const storageKey = model?.storage_key as string | undefined;
    const key = storageKey?.toLowerCase().endsWith(".spz")
      ? `${storageKey.slice(0, -".spz".length)}.manifest.json`
      : null;
    if (!key) return NextResponse.json(null, { status: 404 });

    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      const body = await res.Body?.transformToString();
      if (!body) return NextResponse.json(null, { status: 404 });
      const manifest = JSON.parse(body) as Record<string, unknown>;
      manifest.edit_list = parseEditList(model?.edit_list);
      return NextResponse.json(manifest, {
        status: 200,
        headers: { "cache-control": "private, max-age=300" },
      });
    } catch {
      return NextResponse.json(null, { status: 404 });
    }
  });
}

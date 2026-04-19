import { NextRequest } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { badRequest, ok, serverError } from "@/lib/server/api-response";
import { saveProjectArtifact, type ProjectArtifactKind } from "@/lib/slatedrop/projectArtifacts";
import { logProjectActivity } from "@/lib/projects/activity-log";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

function safeToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest, context: RouteContext) {
  return withProjectAuth(req, context, async ({ orgId, project, projectId, user }) => {
    const body = (await req.json().catch(() => ({}))) as {
      kind?: ProjectArtifactKind;
      title?: string;
      content?: string;
    };

    const kind = body.kind;
    const content = body.content?.trim();
    const title = body.title?.trim() || kind || "record";

    if (!kind || (kind !== "DailyLog" && kind !== "PunchList")) {
      return badRequest("Invalid kind");
    }

    if (!content) {
      return badRequest("Content is required");
    }

    const projectRecord = project as { id: string; name: string };
    const stamp = new Date().toISOString().replace(/[:]/g, "-");
    const filename = `${safeToken(kind.toLowerCase())}-${stamp}-${safeToken(title) || "entry"}.txt`;

    const text = [
      `Project: ${projectRecord.name}`,
      `Kind: ${kind}`,
      `Title: ${title}`,
      `CreatedAt: ${new Date().toISOString()}`,
      "",
      content,
    ].join("\n");

    const bytes = new TextEncoder().encode(text);

    try {
      const artifact = await saveProjectArtifact(
        projectRecord.id,
        projectRecord.name,
        kind,
        {
          name: filename,
          type: "text/plain",
          size: bytes.byteLength,
          arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        },
        { id: user.id },
        orgId
      );

      await logProjectActivity({
        projectId,
        orgId,
        actorId: user.id,
        action: "project.record.saved",
        entityType: "record",
        entityId: String((artifact as { upload?: { id?: string } })?.upload?.id ?? filename),
        metadata: {
          kind,
          title,
        },
      });

      return ok({ ok: true, artifact });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save project record";
      return serverError(message);
    }
  }, "id, name");
}

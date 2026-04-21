import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, notFound } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendDeliverableShareEmail,
  sendDeliverableInlineImageEmail,
  type InlineImageItem,
} from "@/lib/email-site-walk";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://slate360.ai";

/**
 * POST /api/site-walk/deliverables/send
 * Body: { deliverable_id, recipient_email, message?, mode?: "link" | "inline_images" }
 * Default mode is "link". "inline_images" embeds the first 12 photos
 * directly in the email body using public media URLs.
 */
export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ user, orgId }) => {
    if (!orgId) return badRequest("Organization required");

    const body = await req.json();
    const { deliverable_id, recipient_email, message, mode } = body as {
      deliverable_id?: string;
      recipient_email?: string;
      message?: string;
      mode?: "link" | "inline_images";
    };

    if (!deliverable_id || !recipient_email) {
      return badRequest("deliverable_id and recipient_email are required");
    }
    const sendMode: "link" | "inline_images" = mode === "inline_images" ? "inline_images" : "link";

    const admin = createAdminClient();

    const { data: del, error } = await admin
      .from("site_walk_deliverables")
      .select("id, title, deliverable_type, content, share_token, status, share_expires_at, org_id")
      .eq("id", deliverable_id)
      .eq("org_id", orgId)
      .single();

    if (error || !del) return notFound("Deliverable not found");
    if (del.status !== "shared" || !del.share_token) {
      return badRequest("Deliverable must be shared before sending");
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const senderName = profile?.full_name ?? "A Slate360 user";
    // Use the new /view/[token] viewer (PR #27e), not the legacy /share/deliverable/.
    const shareUrl = `${APP_URL}/view/${del.share_token}`;

    try {
      if (sendMode === "inline_images") {
        const items: InlineImageItem[] = inlineImageItemsFromContent(del.content, del.share_token, APP_URL);
        if (items.length === 0) {
          return badRequest("No photos in this deliverable to embed. Use mode=link instead.");
        }
        await sendDeliverableInlineImageEmail({
          to: recipient_email,
          senderName,
          deliverableTitle: del.title,
          shareUrl,
          message: message ?? undefined,
          items,
        });
      } else {
        await sendDeliverableShareEmail({
          to: recipient_email,
          senderName,
          deliverableTitle: del.title,
          deliverableType: del.deliverable_type ?? "deliverable",
          shareUrl,
          expiresAt: del.share_expires_at ?? undefined,
          message: message ?? undefined,
        });
      }

      return ok({ sent: true, mode: sendMode });
    } catch (err) {
      console.error("[deliverable-send]", err);
      return serverError("Failed to send email");
    }
  });

function inlineImageItemsFromContent(content: unknown, token: string, appUrl: string): InlineImageItem[] {
  if (!Array.isArray(content)) return [];
  const out: InlineImageItem[] = [];
  for (const raw of content) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (r.type !== "photo") continue;
    const mediaItemId = typeof r.mediaItemId === "string" ? r.mediaItemId : null;
    if (!mediaItemId) continue;
    out.push({
      title: typeof r.title === "string" && r.title ? r.title : "Photo",
      imageUrl: `${appUrl}/api/view/${token}/media/${mediaItemId}`,
      notes: typeof r.notes === "string" ? r.notes : undefined,
    });
  }
  return out;
}

import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, notFound } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadDeliverableByToken } from "@/lib/site-walk/load-deliverable";
import { renderDeliverablePdf } from "@/lib/site-walk/pdf";
import {
  sendDeliverableShareEmail,
  sendDeliverableInlineImageEmail,
  sendDeliverableAsPdfEmail,
  type InlineImageItem,
} from "@/lib/email-site-walk";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://slate360.ai";

type SendMode = "link" | "inline_images" | "pdf_attachment";

/**
 * POST /api/site-walk/deliverables/send
 * Body: { deliverable_id, recipient_email, message?, mode?: "link" | "inline_images" | "pdf_attachment" }
 * - link            → recipient gets a viewer link
 * - inline_images   → first 12 photos embedded in email body
 * - pdf_attachment  → generated PDF report attached
 */
export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ user, orgId }) => {
    if (!orgId) return badRequest("Organization required");

    const body = await req.json();
    const { deliverable_id, recipient_email, message, mode } = body as {
      deliverable_id?: string;
      recipient_email?: string;
      message?: string;
      mode?: SendMode;
    };

    if (!deliverable_id || !recipient_email) {
      return badRequest("deliverable_id and recipient_email are required");
    }
    const sendMode: SendMode =
      mode === "inline_images" || mode === "pdf_attachment" ? mode : "link";

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
    const shareUrl = `${APP_URL}/view/${del.share_token}`;
    const deliverableTitle = del.title ?? "Deliverable";

    try {
      if (sendMode === "pdf_attachment") {
        const viewerData = await loadDeliverableByToken(del.share_token);
        if (!viewerData) return serverError("Failed to load deliverable rendering data");

        const { data: orgRow } = await admin
          .from("organizations")
          .select("brand_settings, name")
          .eq("id", orgId)
          .single();

        const bs = (orgRow?.brand_settings as Record<string, unknown> | null) ?? {};
        const branding = {
          logoUrl: typeof bs.logo_url === "string" ? bs.logo_url : null,
          signatureUrl: typeof bs.signature_url === "string" ? bs.signature_url : null,
          primaryColor: typeof bs.primary_color === "string" ? bs.primary_color : null,
          companyName: orgRow?.name ?? null,
        };

        const pdfBuffer = await renderDeliverablePdf(viewerData, branding);
        const safeTitle = deliverableTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "report";
        const filename = `${safeTitle}.pdf`;

        await sendDeliverableAsPdfEmail({
          to: recipient_email,
          senderName,
          deliverableTitle,
          message: message ?? undefined,
          pdfBuffer,
          filename,
        });
        // TODO PR #27d.3: audit into site_walk_deliverable_sends with delivery_mode = "pdf_attachment"
      } else if (sendMode === "inline_images") {
        const items: InlineImageItem[] = inlineImageItemsFromContent(del.content, del.share_token, APP_URL);
        if (items.length === 0) {
          return badRequest("No photos in this deliverable to embed. Use mode=link instead.");
        }
        await sendDeliverableInlineImageEmail({
          to: recipient_email,
          senderName,
          deliverableTitle,
          shareUrl,
          message: message ?? undefined,
          items,
        });
      } else {
        await sendDeliverableShareEmail({
          to: recipient_email,
          senderName,
          deliverableTitle,
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

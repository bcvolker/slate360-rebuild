import { NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, notFound } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadDeliverableByToken } from "@/lib/site-walk/load-deliverable";
import { renderDeliverablePdf } from "@/lib/site-walk/pdf";
import { s3, BUCKET } from "@/lib/s3";
import {
  sendDeliverableShareEmail,
  sendDeliverableInlineImageEmail,
  sendDeliverableAsPdfEmail,
  type InlineImageItem,
} from "@/lib/email-site-walk";
import { sendSms, isValidPhone } from "@/lib/sms";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://slate360.ai";

type SendMode = "link" | "inline_images" | "pdf_attachment";

async function freshSignedUrl(s3Key: unknown, fallbackUrl: unknown): Promise<string | null> {
  if (typeof s3Key === "string" && s3Key) {
    try {
      return await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }), {
        expiresIn: 60 * 60,
      });
    } catch {
      // fall through to whatever was stored, better than nothing
    }
  }
  return typeof fallbackUrl === "string" ? fallbackUrl : null;
}

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
    const { deliverable_id, recipient_email, recipient_phone, message, mode } = body as {
      deliverable_id?: string;
      recipient_email?: string;
      recipient_phone?: string;
      message?: string;
      mode?: SendMode;
    };

    if (!deliverable_id || (!recipient_email && !recipient_phone)) {
      return badRequest("deliverable_id and a recipient email or phone are required");
    }
    const sendMode: SendMode =
      mode === "inline_images" || mode === "pdf_attachment" ? mode : "link";

    const admin = createAdminClient();

    const { data: del, error } = await admin
      .from("site_walk_deliverables")
      .select("id, title, deliverable_type, content, share_token, status, share_expires_at, org_id, project_id")
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

    const channels: string[] = [];
    try {
      if (recipient_email) {
      if (sendMode === "pdf_attachment") {
        const viewerData = await loadDeliverableByToken(del.share_token);
        if (!viewerData) return serverError("Failed to load deliverable rendering data");

        const { data: orgRow } = await admin
          .from("organizations")
          .select("brand_settings, name")
          .eq("id", orgId)
          .single();

        const bs = (orgRow?.brand_settings as Record<string, unknown> | null) ?? {};
        // brand_settings.{logo,signature}_url are presigned URLs stamped at upload
        // time with a 7-day expiry — reused verbatim here, a logo silently breaks
        // on any deliverable sent more than a week after the org last re-uploaded
        // it. Re-sign fresh from the stored s3 key (same fields recorded by
        // POST /api/site-walk/branding) whenever one exists.
        const logoUrl = await freshSignedUrl(bs.logo_s3_key, bs.logo_url);
        const signatureUrl = await freshSignedUrl(bs.signature_s3_key, bs.signature_url);
        const branding = {
          logoUrl,
          signatureUrl,
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
        channels.push("email");
      }

      let smsError: string | null = null;
      if (recipient_phone) {
        if (!isValidPhone(recipient_phone)) {
          smsError = "invalid_number";
        } else {
          const smsResult = await sendSms({
            to: recipient_phone,
            body: `${senderName} shared "${deliverableTitle}" with you via Slate360: ${shareUrl}`,
          });
          if (smsResult.ok) {
            channels.push("sms");
          } else {
            smsError = smsResult.reason;
            console.error("[deliverable-send] SMS failed", smsResult);
          }
        }
      }

      if (channels.length === 0) {
        // Nothing went out — surface the real reason (don't report false success).
        return badRequest(
          smsError === "invalid_number"
            ? "That phone number isn't valid. Use international format, e.g. +15551234567."
            : smsError
              ? "Text message could not be sent. Check the number or try email."
              : "Provide a valid email address or phone number.",
        );
      }

      // Record the send for history + the "Delivered" engagement state. Logging
      // must never fail a send that already went out.
      try {
        await admin.from("site_walk_deliverable_sends").insert({
          org_id: orgId,
          project_id: del.project_id ?? null,
          deliverable_id: del.id,
          sent_by: user.id,
          recipient_email: recipient_email?.trim() || null,
          recipient_phone: recipient_phone?.trim() || null,
          delivery_mode: sendMode,
          message: message?.trim() || null,
          status: "sent",
          sent_at: new Date().toISOString(),
          metadata: { channels },
        });
      } catch (logErr) {
        console.error("[deliverable-send] audit-log", logErr);
      }

      return ok({
        sent: true,
        mode: sendMode,
        channels,
        ...(smsError ? { sms_warning: "Email sent, but the text message could not be delivered." } : {}),
      });
    } catch (err) {
      console.error("[deliverable-send]", err);
      return serverError("Failed to send deliverable");
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

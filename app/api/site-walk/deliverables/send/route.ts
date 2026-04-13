import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, notFound } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDeliverableShareEmail } from "@/lib/email-site-walk";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://slate360.ai";

/** POST /api/site-walk/deliverables/send — email a shared deliverable link */
export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ user, orgId }) => {
    if (!orgId) return badRequest("Organization required");

    const body = await req.json();
    const { deliverable_id, recipient_email, message } = body as {
      deliverable_id?: string;
      recipient_email?: string;
      message?: string;
    };

    if (!deliverable_id || !recipient_email) {
      return badRequest("deliverable_id and recipient_email are required");
    }

    const admin = createAdminClient();

    // Fetch deliverable + verify org ownership
    const { data: del, error } = await admin
      .from("site_walk_deliverables")
      .select("id, title, deliverable_type, share_token, status, share_expires_at, org_id")
      .eq("id", deliverable_id)
      .eq("org_id", orgId)
      .single();

    if (error || !del) return notFound("Deliverable not found");
    if (del.status !== "shared" || !del.share_token) {
      return badRequest("Deliverable must be shared before sending");
    }

    // Fetch sender name
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const senderName = profile?.full_name ?? "A Slate360 user";
    const shareUrl = `${APP_URL}/share/deliverable/${del.share_token}`;

    try {
      await sendDeliverableShareEmail({
        to: recipient_email,
        senderName,
        deliverableTitle: del.title,
        deliverableType: del.deliverable_type ?? "deliverable",
        shareUrl,
        expiresAt: del.share_expires_at ?? undefined,
        message: message ?? undefined,
      });

      return ok({ sent: true });
    } catch (err) {
      console.error("[deliverable-send]", err);
      return serverError("Failed to send email");
    }
  });

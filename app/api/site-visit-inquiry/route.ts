import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { deliverLeadEmail, leadSendFailureMessage } from "@/lib/leads/deliver-lead-email";
import { siteVisitLeadHtml } from "@/lib/leads/lead-email-html";
import { uploadBuffer } from "@/lib/s3-utils";
import { signedGetUrl } from "@/lib/storage/signed-get";
import { createAdminClient } from "@/lib/supabase/admin";
import { badRequest, ok, serverError } from "@/lib/server/api-response";
import { createRateLimiter } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const checkRate = createRateLimiter("lead:site-visit", 5, 900);
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const ATTACHMENT_URL_SECONDS = 7 * 24 * 60 * 60;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

/**
 * Public "Request a site visit" form. The notification email is required;
 * the site_visit_inquiries insert is best-effort so a missing migration
 * does not drop a request that already emailed.
 */
export async function POST(req: NextRequest) {
  const limited = await checkRate(req);
  if (limited) return limited;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return badRequest("Invalid form submission.");
  }

  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  if (!name || !email || !email.includes("@")) {
    return badRequest("Name and a valid email are required.");
  }

  const company = String(form.get("company") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const projectLocation = String(form.get("projectLocation") ?? "").trim();
  const lat = finiteOrNull(form.get("lat"));
  const lng = finiteOrNull(form.get("lng"));
  const boundary = parseBoundary(String(form.get("boundary") ?? ""));
  const timeline = String(form.get("timeline") ?? "").trim();
  const whatIsHappening = String(form.get("whatIsHappening") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();

  const uploaded = await storeAttachment(form.get("attachment"));
  if ("error" in uploaded) return badRequest(uploaded.error);

  let attachmentUrl: string | null = null;
  if (uploaded.key) {
    try {
      attachmentUrl = await signedGetUrl(uploaded.key, { expiresIn: ATTACHMENT_URL_SECONDS });
    } catch {
      attachmentUrl = null;
    }
  }

  const html = siteVisitLeadHtml({
    name,
    email,
    company,
    phone,
    projectLocation,
    lat,
    lng,
    boundaryPointCount: Array.isArray(boundary) ? boundary.length : 0,
    timeline,
    whatIsHappening,
    notes,
    attachmentName: uploaded.name,
    attachmentStored: Boolean(uploaded.key),
    attachmentUrl,
  });

  try {
    await deliverLeadEmail({
      subject: `Site visit request — ${name}`,
      html,
      replyTo: email,
    });
  } catch (err) {
    console.error("[site-visit-inquiry] email send failed", leadSendFailureMessage(err));
    return serverError("Could not send your request right now — please try again shortly.");
  }

  try {
    const admin = createAdminClient();
    await admin.from("site_visit_inquiries").insert({
      name,
      company: company || null,
      phone: phone || null,
      email,
      project_location: projectLocation || null,
      location_lat: lat,
      location_lng: lng,
      location_boundary: boundary,
      timeline: timeline || null,
      what_is_happening: whatIsHappening || null,
      notes: notes || null,
      attachment_key: uploaded.key,
      attachment_name: uploaded.name,
      emailed: true,
    });
  } catch {
    console.warn("[site-visit-inquiry] DB write skipped/failed");
  }

  return ok({ ok: true });
}

function finiteOrNull(value: FormDataEntryValue | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseBoundary(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function storeAttachment(
  file: FormDataEntryValue | null,
): Promise<{ key: string | null; name: string | null } | { error: string }> {
  if (!(file instanceof File) || file.size <= 0) return { key: null, name: null };
  if (file.size > MAX_ATTACHMENT_BYTES) return { error: "Attachment is too large (15MB max)." };
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) return { error: "Attachment must be a photo or a PDF." };
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `inquiries/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  try {
    await uploadBuffer(key, buffer, file.type);
    return { key, name: file.name };
  } catch {
    console.error("[site-visit-inquiry] attachment upload failed");
    return { key: null, name: file.name };
  }
}

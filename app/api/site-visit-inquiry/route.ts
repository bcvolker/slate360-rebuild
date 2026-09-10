import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { sendEmail } from "@/lib/email";
import { uploadBuffer } from "@/lib/s3-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { badRequest, ok, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

const INQUIRY_TO = process.env.SITE_VISIT_INQUIRY_EMAIL ?? "slate360ceo@gmail.com";
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);

/**
 * Public "Request a site visit" form submission. Sends the notification
 * email (the primary channel — see docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md
 * §3.13) and, if the site_visit_inquiries table has been migrated in,
 * writes a row too. The email send is the part that must not fail silently;
 * the DB write is best-effort so this route works even before the
 * migration in supabase/migrations/20260910180000_site_visit_inquiries.sql
 * has been applied.
 */
export async function POST(req: NextRequest) {
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
  const lat = form.get("lat") ? Number(form.get("lat")) : null;
  const lng = form.get("lng") ? Number(form.get("lng")) : null;
  const boundaryRaw = String(form.get("boundary") ?? "");
  let boundary: unknown = null;
  if (boundaryRaw) {
    try { boundary = JSON.parse(boundaryRaw); } catch { boundary = null; }
  }
  const timeline = String(form.get("timeline") ?? "").trim();
  const whatIsHappening = String(form.get("whatIsHappening") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();

  let attachmentKey: string | null = null;
  let attachmentName: string | null = null;
  const file = form.get("attachment");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return badRequest("Attachment is too large (15MB max).");
    }
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      return badRequest("Attachment must be a photo or a PDF.");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    attachmentKey = `inquiries/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    attachmentName = file.name;
    try {
      await uploadBuffer(attachmentKey, buffer, file.type);
    } catch (err) {
      console.error("[site-visit-inquiry] attachment upload failed", err);
      attachmentKey = null; // don't block the inquiry over a failed upload
    }
  }

  const mapLink = lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null;

  const html = `
    <h2>New site visit request</h2>
    <p><b>${escapeHtml(name)}</b>${company ? ` — ${escapeHtml(company)}` : ""}</p>
    <p>${escapeHtml(email)}${phone ? ` · ${escapeHtml(phone)}` : ""}</p>
    ${projectLocation ? `<p><b>Location:</b> ${escapeHtml(projectLocation)}</p>` : ""}
    ${mapLink ? `<p><a href="${mapLink}">View on map</a>${Array.isArray(boundary) && boundary.length ? " (boundary outlined)" : ""}</p>` : ""}
    ${timeline ? `<p><b>When:</b> ${escapeHtml(timeline)}</p>` : ""}
    ${whatIsHappening ? `<p><b>What's happening on site:</b> ${escapeHtml(whatIsHappening)}</p>` : ""}
    ${notes ? `<p><b>Notes:</b> ${escapeHtml(notes)}</p>` : ""}
    ${attachmentName ? `<p><b>Attachment:</b> ${escapeHtml(attachmentName)}${attachmentKey ? " (stored)" : " (upload failed — ask the sender to resend it)"}</p>` : ""}
  `;

  let emailed = false;
  try {
    await sendEmail({ to: INQUIRY_TO, subject: `Site visit request — ${name}`, html });
    emailed = true;
  } catch (err) {
    console.error("[site-visit-inquiry] email send failed", err);
    return serverError("Could not send your request right now — please try again shortly.");
  }

  try {
    const admin = createAdminClient();
    await admin.from("site_visit_inquiries").insert({
      name, company: company || null, phone: phone || null, email,
      project_location: projectLocation || null,
      location_lat: lat, location_lng: lng,
      location_boundary: boundary,
      timeline: timeline || null, what_is_happening: whatIsHappening || null, notes: notes || null,
      attachment_key: attachmentKey, attachment_name: attachmentName,
      emailed,
    });
  } catch (err) {
    // Best-effort — the email already went out, which is the part that must
    // not fail. This is expected to no-op until the migration is applied.
    console.warn("[site-visit-inquiry] DB write skipped/failed", err);
  }

  return ok({ ok: true });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

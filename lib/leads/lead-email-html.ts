export function escapeLeadHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function labeled(label: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return `<p><b>${escapeLeadHtml(label)}:</b> ${escapeLeadHtml(trimmed)}</p>`;
}

export type SiteVisitLead = {
  name: string;
  email: string;
  company: string;
  phone: string;
  projectLocation: string;
  lat: number | null;
  lng: number | null;
  boundaryPointCount: number;
  timeline: string;
  whatIsHappening: string;
  notes: string;
  attachmentName: string | null;
  attachmentStored: boolean;
  attachmentUrl: string | null;
};

function mapHref(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function attachmentLine(input: SiteVisitLead): string {
  if (!input.attachmentName) return "";
  const name = escapeLeadHtml(input.attachmentName);
  if (input.attachmentUrl) {
    return `<p><b>Attachment:</b> <a href="${escapeLeadHtml(input.attachmentUrl)}">${name}</a></p>`;
  }
  const note = input.attachmentStored
    ? "stored, link unavailable"
    : "upload failed — ask the sender to resend it";
  return `<p><b>Attachment:</b> ${name} (${note})</p>`;
}

export function siteVisitLeadHtml(input: SiteVisitLead): string {
  const company = input.company.trim() ? ` — ${escapeLeadHtml(input.company.trim())}` : "";
  const phone = input.phone.trim() ? ` · ${escapeLeadHtml(input.phone.trim())}` : "";
  const map = mapHref(input.lat, input.lng);
  const boundary = input.boundaryPointCount > 0 ? " (boundary outlined)" : "";
  return [
    "<h2>New site visit request</h2>",
    `<p><b>${escapeLeadHtml(input.name)}</b>${company}</p>`,
    `<p>${escapeLeadHtml(input.email)}${phone}</p>`,
    labeled("Location", input.projectLocation),
    map ? `<p><a href="${escapeLeadHtml(map)}">View on map</a>${boundary}</p>` : "",
    labeled("When", input.timeline),
    labeled("What's happening on site", input.whatIsHappening),
    labeled("Notes", input.notes),
    attachmentLine(input),
  ]
    .filter(Boolean)
    .join("\n");
}

export function contactLeadHtml(input: { name: string; email: string; message: string }): string {
  const message = escapeLeadHtml(input.message).replace(/\n/g, "<br/>");
  return [
    "<h2>New contact form message</h2>",
    `<p><b>${escapeLeadHtml(input.name)}</b></p>`,
    `<p>${escapeLeadHtml(input.email)}</p>`,
    `<p>${message}</p>`,
  ].join("\n");
}

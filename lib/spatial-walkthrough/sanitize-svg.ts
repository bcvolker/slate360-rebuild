const SCRIPTISH = /<script|on\w+\s*=|javascript:|data:text\/html|<foreignObject|<iframe|<embed|<object|xlink:href\s*=\s*["'](?!#)/i;

export function svgLooksUnsafe(svg: string): boolean {
  return SCRIPTISH.test(svg);
}

function stripUnsafe(svg: string): string {
  return svg
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject\b[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/<object\b[\s\S]*?<\/object>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html[^"'\s]*/gi, "")
    .replace(/xlink:href\s*=\s*["'](?!#)[^"']*["']/gi, 'xlink:href="#"')
    .replace(/href\s*=\s*["']https?:[^"']*["']/gi, 'href="#"');
}

export function sanitizeSvg(svg: string): { ok: true; svg: string } | { ok: false; error: string } {
  const trimmed = svg.trim();
  if (!trimmed.includes("<svg")) return { ok: false, error: "Not an SVG document" };
  const cleaned = stripUnsafe(trimmed);
  if (svgLooksUnsafe(cleaned)) {
    return { ok: false, error: "SVG contains disallowed script or remote content" };
  }
  return { ok: true, svg: cleaned };
}

export function isAllowedLogoMime(contentType: string, filename: string): boolean {
  const c = contentType.toLowerCase().split(";")[0].trim();
  const lower = filename.toLowerCase();
  if (c === "image/svg+xml" || lower.endsWith(".svg")) return true;
  if (c === "image/png" || lower.endsWith(".png")) return true;
  if (c === "image/webp" || lower.endsWith(".webp")) return true;
  return false;
}

export function logoExtension(contentType: string, filename: string): "svg" | "png" | "webp" {
  const lower = filename.toLowerCase();
  if (contentType.includes("svg") || lower.endsWith(".svg")) return "svg";
  if (contentType.includes("webp") || lower.endsWith(".webp")) return "webp";
  return "png";
}
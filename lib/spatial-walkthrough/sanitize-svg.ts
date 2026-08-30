const SCRIPTISH = /<script|on\w+\s*=|javascript:|data:text\/html|<foreignObject|<iframe|<embed|<object|xlink:href\s*=\s*["'](?!#)/i;

export function svgLooksUnsafe(svg: string): boolean {
  return SCRIPTISH.test(svg);
}

export function sanitizeSvg(svg: string): { ok: true; svg: string } | { ok: false; error: string } {
  const trimmed = svg.trim();
  if (!trimmed.includes("<svg")) return { ok: false, error: "Not an SVG document" };
  if (svgLooksUnsafe(trimmed)) {
    return { ok: false, error: "SVG contains disallowed script or remote content" };
  }
  return { ok: true, svg: trimmed };
}

export function isAllowedLogoMime(contentType: string, filename: string): boolean {
  const c = contentType.toLowerCase().split(";")[0].trim();
  const lower = filename.toLowerCase();
  if (c === "image/svg+xml" || lower.endsWith(".svg")) return true;
  if (c === "image/png" || lower.endsWith(".png")) return true;
  if (c === "image/webp" || lower.endsWith(".webp")) return true;
  return false;
}

export type GuardedProductApi = "site-walk" | "twin360" | "thermal" | "content-studio" | "design-studio";

export function productApiFromPath(pathname: string): GuardedProductApi | null {
  if (pathname.startsWith("/api/site-walk")) return "site-walk";
  if (pathname.startsWith("/api/digital-twin")) return "twin360";
  if (pathname.startsWith("/api/thermal") || pathname.startsWith("/api/ops/thermal")) return "thermal";
  if (pathname.startsWith("/api/content-studio")) return "content-studio";
  if (pathname.startsWith("/api/design-studio")) return "design-studio";
  return null;
}

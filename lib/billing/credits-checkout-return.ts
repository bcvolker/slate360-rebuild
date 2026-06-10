const ALLOWED_RETURN_PATHS = new Set([
  "/dashboard",
  "/digital-twin/capture/review",
]);

export function resolveCreditsCheckoutReturnPath(input: unknown): string {
  if (typeof input !== "string") return "/dashboard";

  const trimmed = input.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/dashboard";

  const pathOnly = trimmed.split(/[?#]/, 1)[0] ?? "/dashboard";
  if (!ALLOWED_RETURN_PATHS.has(pathOnly)) return "/dashboard";
  return pathOnly;
}

export function buildCreditsCheckoutUrls(origin: string, returnPath: string) {
  const path = resolveCreditsCheckoutReturnPath(returnPath);
  return {
    success_url: `${origin}${path}?credits=success`,
    cancel_url: `${origin}${path}?credits=cancelled`,
  };
}

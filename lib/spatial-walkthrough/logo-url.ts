export function themeLogoSrc(logoUrl: string | null | undefined, token?: string | null): string | null {
  if (!logoUrl) return null;
  if (logoUrl.startsWith("http") || logoUrl.startsWith("data:") || logoUrl.startsWith("blob:") || logoUrl.startsWith("/")) {
    return logoUrl;
  }
  if (token) return `/api/spatial-walkthrough/public/${token}/logo`;
  return "/api/spatial-walkthrough/theme/logo";
}

export function displayLogoPath(hasLogo: boolean): string | null {
  return hasLogo ? "/api/spatial-walkthrough/theme/logo" : null;
}

import "server-only";

import { loadShareRow, shareDenied } from "@/lib/spatial-walkthrough/share-resolve";
import { cookieUnlocksShare, shareUnlockCookieName } from "@/lib/spatial-walkthrough/share-session";
import { resolveBrandTheme } from "@/lib/spatial-walkthrough/theme";
import { publicMediaContract } from "@/lib/spatial-walkthrough/derivatives";
import type { WalkBoot } from "@/lib/spatial-walkthrough/share-payload";

type CookieReader = { get(name: string): { value: string } | undefined };

const DENIED: WalkBoot = {
  walkId: "",
  title: "",
  posterUrl: null,
  brand: null,
  accessState: "denied",
};

export async function loadPublicWalkBoot(token: string, cookies: CookieReader): Promise<WalkBoot> {
  try {
    const { admin, row } = await loadShareRow(token);
    if (shareDenied(row) || !row) return DENIED;
    const proof = row.token_hash
      ? cookies.get(shareUnlockCookieName(row.token_hash))?.value ?? null
      : null;
    if (!cookieUnlocksShare(row.token_hash ?? "", row.password_hash, proof)) {
      return { ...DENIED, accessState: "password" };
    }
    const { data: wt } = await admin
      .from("spatial_walkthroughs")
      .select("id, title, brand_theme, captured_at")
      .eq("id", row.walkthrough_id)
      .maybeSingle();
    if (!wt) return DENIED;
    const { data: clip } = await admin
      .from("spatial_clips")
      .select("id, proxy_key, public_proxy_key, capture_meta")
      .eq("walkthrough_id", wt.id)
      .eq("status", "ready")
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    const brand = resolveBrandTheme({
      snapshot: row.branding_snapshot as Record<string, unknown> | null,
      walkthrough: wt.brand_theme,
      canHidePoweredBy: true,
    });
    if (brand.logoUrl) brand.logoUrl = `/api/spatial-walkthrough/public/${token}/logo`;
    const media = clip ? publicMediaContract(token, String(clip.id), clip, row.policy) : null;
    return {
      walkId: String(wt.id),
      title: String(wt.title ?? "Spatial Walkthrough"),
      posterUrl: media?.gatePosterUrl ?? null,
      brand,
      accessState: "open",
    };
  } catch {
    return DENIED;
  }
}

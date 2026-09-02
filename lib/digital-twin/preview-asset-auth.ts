import "server-only";

import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveTwinShareToken } from "./share-token";

const PINNED_ORG = "c5538bfd-a67a-4930-8481-0e5e331ec7cc";
const PINNED_SPACE = "e4eaf78b-b064-4cce-b640-8bc8efb820e1";

export async function authorizeTwinPreviewAsset(req: NextRequest, _job: string): Promise<boolean> {
  const share = req.nextUrl.searchParams.get("share") ?? "";
  if (share.length >= 16) {
    const resolved = await resolveTwinShareToken(share);
    if (resolved.ok) {
      const admin = createAdminClient();
      const { data } = await admin
        .from("digital_twin_share_tokens")
        .select("id, space_id, org_id")
        .eq("token", share)
        .maybeSingle();
      if (data?.space_id === PINNED_SPACE && data.org_id === PINNED_ORG) return true;
    }
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const admin = createAdminClient();
    const { data: mem } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("org_id", PINNED_ORG)
      .eq("user_id", user.id)
      .maybeSingle();
    return Boolean(mem);
  } catch {
    return false;
  }
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type ItemRow = Record<string, unknown> & {
  id: string;
  created_by?: string | null;
  created_at?: string | null;
};

export type NearbyItemEnriched = ItemRow & {
  author_name: string | null;
  author_email: string | null;
};

function profileLabel(profile: Record<string, unknown> | undefined): string | null {
  if (!profile) return null;
  const display = profile.display_name;
  if (typeof display === "string" && display.trim()) return display.trim();
  const first = profile.first_name;
  const last = profile.last_name;
  const full = [first, last].filter((v) => typeof v === "string" && v.trim()).join(" ");
  if (full.trim()) return full.trim();
  const email = profile.email;
  if (typeof email === "string" && email.trim()) return email.trim();
  return null;
}

/** Attach profile labels for Ghost Mode timeline cards. */
export async function enrichNearbyItemsWithAuthors(
  admin: SupabaseClient,
  items: ItemRow[],
): Promise<NearbyItemEnriched[]> {
  if (items.length === 0) return [];

  const authorIds = Array.from(
    new Set(items.map((item) => item.created_by).filter((id): id is string => typeof id === "string")),
  );

  const profileMap = new Map<string, Record<string, unknown>>();
  if (authorIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email, display_name, first_name, last_name")
      .in("id", authorIds);
    for (const profile of profiles ?? []) {
      profileMap.set(profile.id as string, profile as Record<string, unknown>);
    }
  }

  return items.map((item) => {
    const profile = item.created_by ? profileMap.get(item.created_by) : undefined;
    return {
      ...item,
      author_name: profileLabel(profile),
      author_email: typeof profile?.email === "string" ? profile.email : null,
    };
  });
}

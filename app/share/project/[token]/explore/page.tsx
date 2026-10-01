import { renderPublicShare } from "@/lib/vnext/share/public-share-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Explore — Slate360", robots: { index: false, follow: false } };

export default async function PublicProjectExplorePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ rep?: string; source?: string; present?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  return renderPublicShare(token, "explore", query);
}

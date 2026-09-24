import { renderPublicShare } from "@/lib/vnext/share/public-share-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compare — Slate360", robots: { index: false, follow: false } };

export default async function PublicProjectComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ a?: string; b?: string; rep?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  return renderPublicShare(token, "compare", query);
}

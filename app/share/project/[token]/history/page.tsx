import { renderPublicShare } from "@/lib/vnext/share/public-share-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "History — Slate360", robots: { index: false, follow: false } };

export default async function PublicProjectHistoryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return renderPublicShare(token, "history");
}

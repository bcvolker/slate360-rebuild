import { renderPublicShare } from "@/lib/vnext/share/public-share-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Visit — Slate360", robots: { index: false, follow: false } };

export default async function PublicProjectVisitPage({
  params,
}: {
  params: Promise<{ token: string; visitId: string }>;
}) {
  const { token, visitId } = await params;
  return renderPublicShare(token, "visit", { visitId });
}

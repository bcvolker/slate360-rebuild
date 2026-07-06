import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicTourViewer } from "@/components/tours/PublicTourViewer";
import { resolvePublicTourSummary } from "@/lib/tours/public-manifest";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PublicTourPage({ params }: Props) {
  const { slug } = await params;
  const admin = createAdminClient();

  const summary = await resolvePublicTourSummary(admin, slug);
  if (!summary) return notFound();

  return <PublicTourViewer slug={slug} summary={summary} />;
}

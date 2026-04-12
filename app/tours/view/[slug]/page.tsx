import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicTourViewer } from "@/components/tours/PublicTourViewer";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PublicTourPage({ params }: Props) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: tour } = await admin
    .from("project_tours")
    .select("id, title, description, viewer_slug, logo_asset_path, logo_width_percent, logo_opacity, logo_position")
    .eq("viewer_slug", slug)
    .eq("status", "published")
    .single();

  if (!tour) return notFound();

  const { data: scenes } = await admin
    .from("tour_scenes")
    .select("id, title, panorama_path, thumbnail_path, initial_yaw, initial_pitch, sort_order")
    .eq("tour_id", tour.id)
    .order("sort_order", { ascending: true });

  return <PublicTourViewer tour={tour} scenes={scenes ?? []} />;
}

import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ session?: string }> };

export default async function NewSiteWalkDeliverablePage({ searchParams }: Props) {
  const { session } = await searchParams;
  redirect(session ? `/site-walk/deliverables?session=${encodeURIComponent(session)}` : "/site-walk/deliverables");
}

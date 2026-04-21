import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SiteWalkIndex() {
  // Default landing for /site-walk → walks list. Auth + auto-provision happen there.
  redirect("/site-walk/walks");
}

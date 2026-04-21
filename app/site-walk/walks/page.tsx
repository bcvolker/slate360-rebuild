import { Footprints } from "lucide-react";
import SiteWalkScreenStub from "@/components/site-walk/SiteWalkScreenStub";

export const metadata = { title: "Walks — Site Walk" };

export default function WalksPage() {
  return (
    <SiteWalkScreenStub
      title="Walks"
      description="Active and past walk-through sessions. Standalone or project-bound."
      icon={Footprints}
    />
  );
}

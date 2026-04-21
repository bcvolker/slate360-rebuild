import { FileText } from "lucide-react";
import SiteWalkScreenStub from "@/components/site-walk/SiteWalkScreenStub";

export const metadata = { title: "Deliverables — Site Walk" };

export default function DeliverablesPage() {
  return (
    <SiteWalkScreenStub
      title="Deliverables"
      description="Reports built from your walks. Branded, AI-formatted, ready to share."
      icon={FileText}
    />
  );
}

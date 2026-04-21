import { Send } from "lucide-react";
import SiteWalkScreenStub from "@/components/site-walk/SiteWalkScreenStub";

export const metadata = { title: "Share — Site Walk" };

export default function SharePage() {
  return (
    <SiteWalkScreenStub
      title="Share"
      description="Sent deliverables, viewing-page comments, and recipient activity."
      icon={Send}
    />
  );
}

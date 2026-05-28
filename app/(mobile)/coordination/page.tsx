import { MobileCoordinationHubClient } from "@/components/mobile-system/MobileCoordinationHubClient";

export const metadata = { title: "Coordination — Slate360" };
export const dynamic = "force-dynamic";

export default function CoordinationHubPage() {
  return <MobileCoordinationHubClient />;
}

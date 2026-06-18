// Preview harness for the redesigned mobile Projects hub (no login).
// /api/projects 401s without auth, so the hub renders header/stats/chips + the
// error/empty state — enough to verify the no-scroll layout and styling.
import { MobileProjectsClient } from "@/components/mobile-system/MobileProjectsClient";

export default function ProjectsHubPreview() {
  return (
    <div className="h-[100dvh] bg-[var(--graphite-canvas)] p-3">
      <MobileProjectsClient />
    </div>
  );
}

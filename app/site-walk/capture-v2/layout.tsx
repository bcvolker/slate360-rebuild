import { CaptureTaskShellLayout } from "@/components/capture-v2/CaptureTaskShellLayout";

/**
 * Capture V2 task shell — true full-screen task mode.
 *
 * Overlays AuthedAppShell chrome (sidebar, mobile bottom nav) via fixed
 * positioning and z-50. Capture V2 routes sit outside act-2 SiteWalkShell,
 * so SiteWalkModuleNav never mounts here.
 */
export default function CaptureV2TaskLayout({ children }: { children: React.ReactNode }) {
  return <CaptureTaskShellLayout>{children}</CaptureTaskShellLayout>;
}

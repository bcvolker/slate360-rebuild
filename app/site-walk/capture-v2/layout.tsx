/**
 * Capture V2 task shell — true full-screen task mode.
 *
 * Overlays AuthedAppShell chrome (sidebar, mobile bottom nav) via fixed
 * positioning and z-50. Capture V2 routes sit outside act-2 SiteWalkShell,
 * so SiteWalkModuleNav never mounts here.
 */
export default function CaptureV2TaskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex min-h-0 flex-col overflow-hidden bg-[#0B0F15]"
      style={{ height: "100dvh", maxHeight: "100dvh" }}
    >
      {children}
    </div>
  );
}

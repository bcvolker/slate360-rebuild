/**
 * Capture Task Shell — isolated full-screen layout for Site Walk capture.
 *
 * This layout overlays the SiteWalkModuleNav by using fixed positioning with
 * z-50, giving capture 100% of the viewport (100dvh). The sticky module nav
 * still renders underneath but is completely hidden.
 *
 * This fixes the desktop spill (capture extending under the header/off-screen)
 * and the mobile layout where the nav ate 80-100px of capture viewport.
 */
export default function CaptureTaskShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0F15] h-[100dvh] overflow-hidden">
      {children}
    </div>
  );
}

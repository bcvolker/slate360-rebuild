/**
 * Capture Task Shell — true full-screen task mode.
 *
 * ARCHITECTURE:
 * - `fixed inset-0` overlays the entire viewport, hiding SiteWalkModuleNav.
 * - `z-50` ensures this sits above all shell chrome (nav is z-30).
 * - `h-[100dvh]` uses dynamic viewport height (accounts for iOS Safari chrome).
 * - `overflow-hidden` prevents any child scroll bleed to the body.
 * - `flex flex-col` gives children a predictable vertical layout.
 *
 * The SiteWalkModuleNav still renders in the DOM underneath but is
 * completely invisible and unreachable. This is intentional — the capture
 * route provides its own "Exit Walk" button to return to /site-walk.
 *
 * NO child of this layout should EVER use `position: fixed` with z-index
 * above 50 unless it's a modal overlay (z-[60]+).
 */
export default function CaptureTaskShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0B0F15]"
      style={{ height: "100dvh", maxHeight: "100dvh" }}
    >
      {children}
    </div>
  );
}

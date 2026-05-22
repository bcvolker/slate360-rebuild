/**
 * Capture V2 summary task shell — same full-bleed contract as capture.
 */
export default function CaptureV2SummaryTaskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex min-h-0 flex-col overflow-hidden bg-[#0B0F15]"
      style={{ height: "100dvh", maxHeight: "100dvh" }}
    >
      {children}
    </div>
  );
}

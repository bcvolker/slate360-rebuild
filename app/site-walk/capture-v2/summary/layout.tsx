import { CaptureTaskShellLayout } from "@/components/capture-v2/CaptureTaskShellLayout";

/** Capture V2 summary task shell — same full-bleed contract as capture. */
export default function CaptureV2SummaryTaskLayout({ children }: { children: React.ReactNode }) {
  return <CaptureTaskShellLayout>{children}</CaptureTaskShellLayout>;
}

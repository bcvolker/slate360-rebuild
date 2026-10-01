import type { ReactNode } from "react";
import { VnextRoot } from "@/components/vnext/VnextRoot";
import { VnextReviewBanner } from "@/components/vnext/VnextReviewBanner";

export const metadata = {
  title: "vNext preview — Slate360",
  robots: { index: false, follow: false },
};

export default function PreviewVnextLayout({ children }: { children: ReactNode }) {
  return (
    <VnextRoot>
      <VnextReviewBanner />
      {children}
    </VnextRoot>
  );
}

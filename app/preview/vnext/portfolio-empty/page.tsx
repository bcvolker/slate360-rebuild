"use client";

import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextPortfolioClient } from "@/components/vnext/portfolio/VnextPortfolioClient";

export default function PreviewVnextPortfolioEmptyPage() {
  return (
    <VnextClientShell pathname="/vnext/projects">
      <VnextPortfolioClient records={[]} fixture="empty" />
    </VnextClientShell>
  );
}

"use client";

import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextPortfolioClient } from "@/components/vnext/portfolio/VnextPortfolioClient";

export default function PreviewVnextPortfolioLoadingPage() {
  return (
    <VnextClientShell pathname="/vnext/projects">
      <VnextPortfolioClient records={[]} fixture="loading" />
    </VnextClientShell>
  );
}

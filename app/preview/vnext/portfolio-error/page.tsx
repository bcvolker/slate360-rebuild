"use client";

import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextPortfolioClient } from "@/components/vnext/portfolio/VnextPortfolioClient";

export default function PreviewVnextPortfolioErrorPage() {
  return (
    <VnextClientShell pathname="/vnext/projects">
      <VnextPortfolioClient records={[]} fixture="error" />
    </VnextClientShell>
  );
}

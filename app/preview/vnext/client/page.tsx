"use client";

import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextPortfolioClient } from "@/components/vnext/portfolio/VnextPortfolioClient";
import { PREVIEW_PORTFOLIO_RECORDS } from "@/lib/vnext/preview-portfolio-fixtures";

export default function PreviewVnextClientPage() {
  return (
    <VnextClientShell pathname="/vnext/projects">
      <VnextPortfolioClient records={PREVIEW_PORTFOLIO_RECORDS} />
    </VnextClientShell>
  );
}

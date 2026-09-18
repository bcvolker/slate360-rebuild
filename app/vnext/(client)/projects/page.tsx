import { VnextPortfolioClient } from "@/components/vnext/portfolio/VnextPortfolioClient";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";

export const metadata = {
  title: "Projects — Slate360",
};

export default async function VnextProjectsPage() {
  const ctx = await requireVnextSession("/vnext/projects");
  if (!ctx.user) {
    return (
      <VnextPortfolioClient
        records={[]}
        loadError="Projects could not be loaded. Check your connection and try again."
      />
    );
  }
  const { loadClientPortfolio } = await import("@/lib/vnext/load-client-portfolio");
  const { records, error } = await loadClientPortfolio(ctx.user.id);
  return <VnextPortfolioClient records={records} loadError={error} />;
}

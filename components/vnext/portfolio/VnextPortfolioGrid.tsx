import { VnextProjectCard } from "@/components/vnext/portfolio/VnextProjectCard";
import type { PortfolioRecord } from "@/lib/vnext/portfolio-types";

export function VnextPortfolioGrid({ projects }: { projects: PortfolioRecord[] }) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-10 p-0 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <li key={project.id} className="min-w-0">
          <VnextProjectCard project={project} />
        </li>
      ))}
    </ul>
  );
}

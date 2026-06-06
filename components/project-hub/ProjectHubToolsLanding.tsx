"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  FileSearch,
  Layers,
  MapPinned,
  Receipt,
  Wrench,
} from "lucide-react";
import type { AppIcon } from "@/lib/types/app-icon";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type ToolModule = {
  id: string;
  title: string;
  description: string;
  segment: string;
  icon: AppIcon;
  /** When false, card is non-navigable until the sub-route ships. */
  routable: boolean;
};

const TOOL_MODULES: ToolModule[] = [
  {
    id: "maps",
    title: "Maps & Site Location",
    description: "Site boundaries, coordinates, and map context for this project.",
    segment: "maps",
    icon: MapPinned,
    routable: true,
  },
  {
    id: "pdf-workbench",
    title: "PDF Workbench",
    description: "Markup, compare, and export plan PDFs without leaving the hub.",
    segment: "pdf-workbench",
    icon: Layers,
    routable: false,
  },
  {
    id: "document-intelligence",
    title: "Document Intelligence",
    description: "Extract specs, submittals, and drawing metadata with structured search.",
    segment: "document-intelligence",
    icon: FileSearch,
    routable: false,
  },
  {
    id: "financial-docs",
    title: "Financial Docs (SOV / Pay App / Invoice)",
    description: "SOV, pay applications, and invoice workflows tied to project cost data.",
    segment: "financial-docs",
    icon: Receipt,
    routable: false,
  },
];

type ProjectHubToolsLandingProps = {
  projectId: string;
};

function ToolModuleCard({
  projectId,
  module,
}: {
  projectId: string;
  module: ToolModule;
}) {
  const Icon = module.icon;
  const href = `/project-hub/${projectId}/tools/${module.segment}`;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(203,213,225,0.18)] bg-[rgba(203,213,225,0.06)] text-teal">
          <Icon size={18} strokeWidth={1.75} />
        </span>
        {!module.routable && (
          <span className="shrink-0 rounded-full border border-[rgba(203,213,225,0.22)] bg-[rgba(203,213,225,0.08)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal">
            Next phase
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        <h2 className="text-base font-bold text-zinc-100">{module.title}</h2>
        <p className="text-sm leading-relaxed text-zinc-400">{module.description}</p>
      </div>

      <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-teal/80">
        {module.routable ? (
          <>
            Open module
            <ChevronRight size={14} />
          </>
        ) : (
          <span className="text-zinc-500">Coming in next phase</span>
        )}
      </div>
    </>
  );

  const cardClass = cn(
    "glass-card group flex h-full flex-col p-5 transition-all",
    module.routable
      ? "hover:border-[rgba(203,213,225,0.35)] hover:bg-[rgba(15,23,42,0.72)] hover:shadow-teal-glow cursor-pointer"
      : "opacity-90",
  );

  if (module.routable) {
    return (
      <Link href={href} className={cardClass} data-tool-module={module.id}>
        {body}
      </Link>
    );
  }

  return (
    <div
      className={cardClass}
      data-tool-module={module.id}
      aria-disabled="true"
    >
      {body}
    </div>
  );
}

export function ProjectHubToolsLanding({ projectId }: ProjectHubToolsLandingProps) {
  const isMobile = useIsMobile();
  const router = useRouter();

  useEffect(() => {
    if (isMobile) {
      router.replace(`/project-hub/${projectId}`);
    }
  }, [isMobile, projectId, router]);

  if (isMobile) {
    return null;
  }

  return (
    <div className="space-y-8">
      <header className="glass-card border-[rgba(203,213,225,0.14)] p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(203,213,225,0.2)] bg-[rgba(203,213,225,0.08)] text-teal">
            <Wrench size={20} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal/70">
              Desktop workspace
            </p>
            <h1 className="mt-1 text-xl font-black text-zinc-100 sm:text-2xl">Project tools</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Document, map, and financial modules for deep desktop work. Field capture stays
              on mobile — these tools extend what you already uploaded in Files and Plans.
            </p>
          </div>
        </div>
      </header>

      <section aria-label="Tool modules">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-200">Modules</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Select a module to open its dedicated workspace.
            </p>
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {TOOL_MODULES.map((module) => (
            <li key={module.id}>
              <ToolModuleCard projectId={projectId} module={module} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

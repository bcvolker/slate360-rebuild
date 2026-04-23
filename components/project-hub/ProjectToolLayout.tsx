/**
 * ProjectToolLayout — standardized chrome for all Project Hub Tier-3 tool pages.
 *
 * Renders: breadcrumb, back nav, page title, action slot, and children.
 * Replaces the ~40 lines of identical header/nav code duplicated in each tool page.
 *
 * Usage:
 *   <ProjectToolLayout projectId={projectId} title="RFIs" actions={<CreateButton />}>
 *     <TableContent />
 *   </ProjectToolLayout>
 */
"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface ProjectToolLayoutProps {
  projectId: string;
  /** Tool name shown as the page title */
  title: string;
  /** Optional subtitle / count badge shown next to the title */
  subtitle?: ReactNode;
  /** Buttons/actions rendered in the top-right of the header */
  actions?: ReactNode;
  /** Secondary row below the title (filters, search, etc.) */
  toolbar?: ReactNode;
  children: ReactNode;
  /** Back-link override. Defaults to /project-hub/[projectId] */
  backHref?: string;
  /** Custom back-link label */
  backLabel?: string;
}

export default function ProjectToolLayout({
  projectId,
  title,
  subtitle,
  actions,
  toolbar,
  children,
  backHref,
  backLabel = "Back to project",
}: ProjectToolLayoutProps) {
  const resolvedBackHref = backHref ?? `/project-hub/${projectId}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Breadcrumb / back nav */}
        <div className="mb-5">
          <Link
            href={resolvedBackHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ChevronLeft size={14} />
            {backLabel}
          </Link>
        </div>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-zinc-100">{title}</h1>
            {subtitle && <span>{subtitle}</span>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>

        {/* Optional toolbar row (search, filters, view options) */}
        {toolbar && (
          <div className="mb-4">{toolbar}</div>
        )}

        {/* Main content */}
        {children}
      </div>
    </div>
  );
}

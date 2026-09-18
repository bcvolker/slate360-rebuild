import type { ReactNode } from "react";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
};

/**
 * Presentational only. Each page below independently calls requireVnextSession
 * with its own exact path (see UI_DESIGN_RULES.md: "Auth is performed by
 * individual vNext pages, not only a shared layout") so unauthenticated /
 * unapproved users get the correct redirectTo for the route they requested,
 * not a layout-truncated one.
 */
export default async function VnextProjectLayout({ children, params }: LayoutProps) {
  const { projectId } = await params;
  return (
    <div className="min-w-0">
      <VnextProjectNav projectId={projectId} />
      {children}
    </div>
  );
}

import { ContentStudioWorkspace } from "@/components/content-studio/workspace/ContentStudioWorkspace";

export const dynamic = "force-static";

/**
 * Unauthenticated render harness for the Content Studio shell. The real route is
 * CEO-gated (sandbox can't log in), so this mirrors the Thermal Studio preview
 * harnesses for visual/DOM testing. No real data — shell chrome only.
 */
export default function ContentStudioShellPreview() {
  return (
    <div className="h-screen w-screen">
      <ContentStudioWorkspace />
    </div>
  );
}

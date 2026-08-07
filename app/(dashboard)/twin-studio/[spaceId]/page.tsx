import { notFound } from "next/navigation";
import { TwinStudioShell } from "@/components/twin-studio/TwinStudioShell";
import { loadTwinStudioSpace } from "@/lib/digital-twin/load-twin-studio-data";
import { loadDesktopEditorData } from "@/lib/digital-twin/load-desktop-editor";
import { loadTwinSpaceViewerData } from "@/lib/digital-twin/load-space-viewer";
import { resolveServerOrgContext } from "@/lib/server/org-context";

type PageProps = { params: Promise<{ spaceId: string }> };

export default async function TwinStudioSpacePage({ params }: PageProps) {
  const { spaceId } = await params;
  const { orgId } = await resolveServerOrgContext();
  const space = await loadTwinStudioSpace(spaceId, orgId);
  if (!space) notFound();

  // F2: null when the space has no ready splat model yet (still processing,
  // failed, or an exterior/GLB space) — CleanPanel shows an honest empty
  // state rather than erroring.
  const [editorData, viewer] = await Promise.all([
    loadDesktopEditorData(spaceId, orgId),
    // UX-FIX: published/primary model of ANY format, so Produce shows the
    // model itself immediately — one click from the dashboard to seeing it.
    loadTwinSpaceViewerData(spaceId, orgId),
  ]);

  return (
    <div className="h-full min-h-0 p-3">
      <TwinStudioShell space={space} editorData={editorData} viewer={viewer} />
    </div>
  );
}

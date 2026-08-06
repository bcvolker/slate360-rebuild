import { Wrench } from "lucide-react";
import { DesktopSplatEditor } from "@/components/digital-twin/desktop/DesktopSplatEditor";
import type { TwinDesktopEditorData } from "@/lib/digital-twin/load-desktop-editor";

/**
 * F2 — embeds the existing desktop splat editor directly in the Studio,
 * instead of only being reachable via the orphaned /twins/[id]/editor route.
 * editorData is null when the space has no ready splat model yet (still
 * processing, failed, or an exterior/GLB space) — that's an honest empty
 * state, not an error.
 */
export function CleanPanel({ editorData }: { editorData: TwinDesktopEditorData | null }) {
  if (!editorData) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <Wrench className="size-6 text-[var(--graphite-muted)]" aria-hidden />
        <p className="text-sm font-medium text-zinc-200">No splat model ready to clean yet</p>
        <p className="max-w-sm text-xs text-[var(--graphite-muted)]">
          Once a reconstruction completes on the Produce tab, it appears here for crop/slice/erase
          cleanup.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto p-4">
      <DesktopSplatEditor
        spaceId={editorData.spaceId}
        spaceTitle={editorData.spaceTitle}
        modelId={editorData.modelId}
        modelTitle={editorData.modelTitle}
        modelUrl={editorData.modelUrl}
        initialEditList={editorData.editList}
      />
    </div>
  );
}

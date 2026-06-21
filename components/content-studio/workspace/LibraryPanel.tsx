"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, GripVertical, Library } from "lucide-react";
import { buildStarterCatalog, type StarterLibraryItem } from "@/lib/content-studio/starter-library";
import { useEditorStore } from "./editor-store";
import { encodeLibraryDrag, LIBRARY_DND } from "./library-dnd";

const CATALOG = buildStarterCatalog();

/** Reusable Library tab — categories, drag targets, click-to-apply. */
export function LibraryPanel() {
  const focusCategory = useEditorStore((s) => s.libraryCategory);
  const libraryToast = useEditorStore((s) => s.libraryToast);
  const pendingTransition = useEditorStore((s) => s.pendingTransition);
  const activeLookName = useEditorStore((s) => s.activeLookName);
  const setLibraryToast = useEditorStore((s) => s.setLibraryToast);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!focusCategory) return;
    setOpen((o) => ({ ...o, [focusCategory]: true }));
  }, [focusCategory]);

  useEffect(() => {
    if (!libraryToast) return;
    const t = setTimeout(() => setLibraryToast(null), 3500);
    return () => clearTimeout(t);
  }, [libraryToast, setLibraryToast]);

  const toggle = useCallback((label: string) => {
    setOpen((o) => ({ ...o, [label]: !o[label] }));
  }, []);

  return (
    <div className="space-y-1">
      {(libraryToast || pendingTransition || activeLookName) && (
        <div className="mb-2 rounded-md border border-[#3D8EFF]/30 bg-[#3D8EFF]/10 px-2 py-1.5 text-[10px] text-white/75">
          {libraryToast ?? (pendingTransition ? `Transition: ${pendingTransition.name}` : activeLookName ? `Look: ${activeLookName}` : null)}
        </div>
      )}
      {CATALOG.categories.map((cat) => (
        <CategoryBlock
          key={cat.label}
          label={cat.label}
          count={cat.count}
          expanded={!!open[cat.label]}
          onToggle={() => toggle(cat.label)}
          items={CATALOG.items.filter((i) => i.category === cat.label)}
        />
      ))}
      {CATALOG.categories.every((c) => c.count === 0) && (
        <EmptyHint icon={<Library className="h-5 w-5" />} text="Starter Library catalog is empty." />
      )}
    </div>
  );
}

function CategoryBlock({
  label,
  count,
  expanded,
  onToggle,
  items,
}: {
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  items: StarterLibraryItem[];
}) {
  return (
    <div className="rounded-md border border-white/10">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-2.5 py-2 text-xs text-white/70 hover:bg-white/5"
      >
        <span className="flex items-center gap-1.5">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {label}
        </span>
        <span className="text-white/30">{count}</span>
      </button>
      {expanded && items.length > 0 && (
        <div className="space-y-1 border-t border-white/5 px-1.5 py-1.5">
          {items.map((item) => (
            <LibraryItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryItemRow({ item }: { item: StarterLibraryItem }) {
  const applyLook = useEditorStore((s) => s.applyLibraryLook);
  const setPendingTransition = useEditorStore((s) => s.setPendingTransition);
  const setInspectorTab = useEditorStore((s) => s.setInspectorTab);
  const setLibraryToast = useEditorStore((s) => s.setLibraryToast);

  const dragPayload = encodeLibraryDrag({
    id: item.id,
    assetType: item.assetType,
    name: item.name,
    dropTarget: item.dropTarget,
    metadata: item.metadata,
    lookJson: item.lookJson,
  });

  const onClick = () => {
    if (item.dropTarget === "color_inspector") {
      applyLook({ id: item.id, name: item.name, lookJson: item.lookJson });
      return;
    }
    if (item.dropTarget === "cut_boundary") {
      const xfade = String(item.metadata.xfade ?? "fade");
      const durationSec = Number(item.metadata.durationSec ?? 0.8);
      setPendingTransition({ xfade, durationSec, name: item.name });
      return;
    }
    if (item.dropTarget === "export_preset") {
      setInspectorTab("export");
      setLibraryToast(`Export preset: ${item.name}`);
      return;
    }
    if (item.dropTarget === "titles_lane") {
      setInspectorTab("titles");
      setLibraryToast(`Added template: ${item.name} (titles lane in slice 13)`);
      return;
    }
    setLibraryToast(`Drag ${item.name} to the ${item.dropTarget.replace("_", " ")}`);
  };

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData(LIBRARY_DND, dragPayload)}
      onClick={onClick}
      title={`${item.name} · ${item.dropTarget.replace(/_/g, " ")}`}
      className="flex cursor-grab items-center gap-1.5 rounded px-1.5 py-1 text-[11px] text-white/60 hover:bg-white/5 active:cursor-grabbing"
    >
      <GripVertical className="h-3 w-3 shrink-0 text-white/25" />
      <span className="truncate">{item.name}</span>
      <span className="ml-auto shrink-0 text-[9px] uppercase tracking-wide text-white/25">{item.license.split(" ")[0]}</span>
    </div>
  );
}

function EmptyHint({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-2 px-3 text-center text-[11px] text-white/35">
      <span className="text-white/25">{icon}</span>
      {text}
    </div>
  );
}

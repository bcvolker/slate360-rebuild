"use client";

import { useRef } from "react";
import { Boxes, FolderOpen, Images, MapPin, Plane, X } from "lucide-react";
import type { TwinReviewAddedSource } from "@/lib/digital-twin/twin-capture-pending-session";
import {
  classifyTwinMedia,
  hasMixedTwinMediaCategories,
  isTwinScanCategory,
  type TwinMediaCategory,
} from "@/lib/digital-twin/twin-review-media";

/** Point-cloud / LiDAR / mesh / geospatial formats accepted from desktop. */
const SCAN_ACCEPT = ".ply,.las,.laz,.e57,.pcd,.xyz,.pts,.obj,.glb,.gltf,.fbx,.stl,.kml,.gpx,.geojson";
import { TwinSubmitGlassCard } from "./TwinSubmitGlassCard";
import { twinSubmitTokens } from "./twin-submit-tokens";

type Props = {
  addedSources: TwinReviewAddedSource[];
  captureCategories: TwinMediaCategory[];
  assetCount: number;
  onAddFiles: (files: File[], origin: "camera_roll" | "files") => void;
  onRemoveSource: (id: string) => void;
  onOpenSlateDrop: () => void;
};

function is360PhotoCategory(category: TwinMediaCategory): boolean {
  return category === "360_photo" || category === "phone_photo" || category === "other";
}

function isDroneCategory(category: TwinMediaCategory): boolean {
  return category === "drone_video" || category === "drone_photo";
}

export function TwinSubmitStepSources({
  addedSources,
  captureCategories,
  assetCount,
  onAddFiles,
  onRemoveSource,
  onOpenSlateDrop,
}: Props) {
  const rollRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const droneRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const addedCategories = addedSources.map((source) =>
    source.origin === "slatedrop"
      ? classifyTwinMedia(
          new File([], source.pickerFile.name, {
            type: source.pickerFile.type || "application/octet-stream",
          }),
        )
      : classifyTwinMedia(source.file),
  );

  const showMixWarning = hasMixedTwinMediaCategories([...captureCategories, ...addedCategories]);

  const sourcesScan = addedSources.filter((_, index) => isTwinScanCategory(addedCategories[index]));
  const sources360 = addedSources.filter(
    (_, index) => is360PhotoCategory(addedCategories[index]) && !isTwinScanCategory(addedCategories[index]),
  );
  const sourcesDrone = addedSources.filter((_, index) => isDroneCategory(addedCategories[index]));

  return (
    <div className="space-y-4" data-twin-submit="step-sources">
      <p className={twinSubmitTokens.bodyText}>
        {assetCount} asset{assetCount === 1 ? "" : "s"} added to this scan
      </p>

      <TwinSubmitGlassCard title="360 Photos">
        <div className="grid grid-cols-2 gap-2">
          <SourceButton label="Upload" icon={Images} onClick={() => rollRef.current?.click()} />
          <SourceButton label="Add from SlateDrop" icon={FolderOpen} onClick={onOpenSlateDrop} />
        </div>
        <SourceList sources={sources360} onRemove={onRemoveSource} />
      </TwinSubmitGlassCard>

      <TwinSubmitGlassCard title="Drone Footage">
        <div className="grid grid-cols-2 gap-2">
          <SourceButton label="Upload video" icon={Plane} onClick={() => droneRef.current?.click()} />
          <SourceButton label="Browse files" icon={FolderOpen} onClick={() => filesRef.current?.click()} />
        </div>
        <SourceList sources={sourcesDrone} onRemove={onRemoveSource} />
      </TwinSubmitGlassCard>

      <TwinSubmitGlassCard title="3D scans & models">
        <p className="mb-2 text-[11px] leading-snug text-[var(--graphite-muted)]">
          Add LiDAR / point clouds (.ply, .las, .e57), meshes (.obj, .glb), or GPS tracks (.kml, .gpx) for a
          richer, more accurate model.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <SourceButton label="Add scans" icon={Boxes} onClick={() => scanRef.current?.click()} />
          <SourceButton label="Add from SlateDrop" icon={FolderOpen} onClick={onOpenSlateDrop} />
        </div>
        <SourceList sources={sourcesScan} onRemove={onRemoveSource} />
      </TwinSubmitGlassCard>

      <TwinSubmitGlassCard title="Surrounding context">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)] text-[var(--twin360-blue)]">
            <MapPin className="h-4 w-4" />
          </span>
          <div>
            <p className={twinSubmitTokens.headerText}>Select surrounding context area</p>
            <p className="mt-1 text-[11px] leading-snug text-[var(--graphite-muted)]">
              GPS from your capture is included automatically. Map-based context selection will
              refine exterior alignment.
            </p>
          </div>
        </div>
      </TwinSubmitGlassCard>

      {showMixWarning ? (
        <p className="text-[11px] leading-snug text-[var(--graphite-muted)]">
          Mixing different camera types can reduce reconstruction quality.
        </p>
      ) : null}

      <input
        ref={rollRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const list = event.target.files ? Array.from(event.target.files) : [];
          if (list.length) onAddFiles(list, "camera_roll");
          event.target.value = "";
        }}
      />
      <input
        ref={droneRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const list = event.target.files ? Array.from(event.target.files) : [];
          if (list.length) onAddFiles(list, "camera_roll");
          event.target.value = "";
        }}
      />
      <input
        ref={filesRef}
        type="file"
        accept={`image/*,video/*,${SCAN_ACCEPT}`}
        multiple
        className="hidden"
        onChange={(event) => {
          const list = event.target.files ? Array.from(event.target.files) : [];
          if (list.length) onAddFiles(list, "files");
          event.target.value = "";
        }}
      />
      <input
        ref={scanRef}
        type="file"
        accept={SCAN_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          const list = event.target.files ? Array.from(event.target.files) : [];
          if (list.length) onAddFiles(list, "files");
          event.target.value = "";
        }}
      />
    </div>
  );
}

function SourceButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof Images;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)] px-2 py-2 text-center transition active:scale-[0.98]"
    >
      <Icon className="h-4 w-4 text-[var(--twin360-blue)]" />
      <span className="text-[10px] font-semibold text-[var(--graphite-text-body)]">{label}</span>
    </button>
  );
}

function SourceList({
  sources,
  onRemove,
}: {
  sources: TwinReviewAddedSource[];
  onRemove: (id: string) => void;
}) {
  if (!sources.length) return null;
  return (
    <ul className="mt-3 space-y-1.5">
      {sources.map((source) => (
        <li
          key={source.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] px-3 py-2"
        >
          <span className="truncate text-xs text-[var(--graphite-text-body)]">
            {source.origin === "slatedrop" ? source.pickerFile.name : source.file.name}
          </span>
          <button
            type="button"
            onClick={() => onRemove(source.id)}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
            aria-label="Remove source"
          >
            <X className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

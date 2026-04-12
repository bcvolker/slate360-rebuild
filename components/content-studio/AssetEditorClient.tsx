"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Loader2,
  Settings,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssetSettingsPanel } from "./AssetSettingsPanel";

interface AssetData {
  id: string;
  title: string;
  s3_key: string;
  content_type: string;
  file_size_bytes: number;
  media_type: string;
  width: number | null;
  height: number | null;
  duration_secs: number | null;
  tags: string[];
  created_at: string;
}

interface AssetEditorClientProps {
  assetId: string;
  onBack: () => void;
}

export function AssetEditorClient({ assetId, onBack }: AssetEditorClientProps) {
  const [asset, setAsset] = useState<AssetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAsset = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content-studio/assets/${assetId}`);
      if (res.ok) {
        const d = await res.json();
        setAsset(d.data ?? d);
      }
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  async function handleSaveSettings(
    title: string,
    tags: string[],
  ) {
    if (!asset) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/content-studio/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, tags }),
      });
      if (res.ok) {
        setAsset({ ...asset, title, tags });
        setShowSettings(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!asset) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Asset not found.
      </p>
    );
  }

  const typeIcons: Record<string, typeof ImageIcon> = {
    image: ImageIcon,
    video: Video,
    document: FileText,
    audio: Music,
  };
  const TypeIcon = typeIcons[asset.media_type] ?? FileText;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 size-4" /> Assets
          </Button>
          <h2 className="text-lg font-bold">{asset.title}</h2>
          <Badge variant="secondary">{asset.media_type}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href={`/api/uploads/download?key=${encodeURIComponent(asset.s3_key)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="mr-1 size-3.5" /> Download
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="mr-1 size-3.5" /> Settings
          </Button>
        </div>
      </div>

      {showSettings && (
        <AssetSettingsPanel
          title={asset.title}
          tags={asset.tags}
          saving={saving}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Preview area */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden rounded-lg bg-zinc-900 p-4">
        {asset.media_type === "image" && asset.s3_key ? (
          <img
            src={`/api/uploads/download?key=${encodeURIComponent(asset.s3_key)}`}
            alt={asset.title}
            className="max-h-full max-w-full rounded object-contain"
          />
        ) : asset.media_type === "video" && asset.s3_key ? (
          <video
            src={`/api/uploads/download?key=${encodeURIComponent(asset.s3_key)}`}
            controls
            className="max-h-full max-w-full rounded"
          />
        ) : asset.media_type === "audio" && asset.s3_key ? (
          <div className="text-center">
            <Music className="mx-auto mb-4 size-16 text-zinc-500" />
            <audio
              src={`/api/uploads/download?key=${encodeURIComponent(asset.s3_key)}`}
              controls
              className="mx-auto"
            />
          </div>
        ) : (
          <div className="text-center text-zinc-500">
            <TypeIcon className="mx-auto mb-2 size-12" />
            <p className="text-sm">Preview not available for this file type</p>
          </div>
        )}
      </div>

      {/* Metadata footer */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>
          {(asset.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
        </span>
        <span>{asset.content_type}</span>
        {asset.width && asset.height && (
          <span>
            {asset.width} x {asset.height}
          </span>
        )}
        {asset.duration_secs != null && (
          <span>{Math.round(asset.duration_secs)}s</span>
        )}
        {asset.tags.length > 0 && (
          <span>Tags: {asset.tags.join(", ")}</span>
        )}
      </div>
    </div>
  );
}

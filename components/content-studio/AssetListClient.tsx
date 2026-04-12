"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Asset {
  id: string;
  title: string;
  s3_key: string;
  content_type: string;
  file_size_bytes: number;
  media_type: string;
  tags: string[];
  created_at: string;
}

interface AssetListClientProps {
  projectId: string;
  onSelectAsset: (id: string) => void;
}

const MEDIA_ICONS: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
  document: FileText,
  audio: Music,
};

export function AssetListClient({
  projectId,
  onSelectAsset,
}: AssetListClientProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState<string>("");

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("mediaType", filterType);
      const res = await fetch(`/api/content-studio/assets?${params}`);
      if (res.ok) {
        const d = await res.json();
        setAssets(d.data ?? d ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  function inferMediaType(contentType: string): string {
    if (contentType.startsWith("image/")) return "image";
    if (contentType.startsWith("video/")) return "video";
    if (contentType.startsWith("audio/")) return "audio";
    return "document";
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // 1. Get presigned URL from shared upload endpoint
      const urlRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
          prefix: `content-studio/${projectId}`,
        }),
      });
      if (!urlRes.ok) return;
      const urlData = await urlRes.json();
      const { uploadUrl, s3Key } = urlData.data ?? urlData;

      // 2. Upload to S3
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      // 3. Create asset record
      const createRes = await fetch("/api/content-studio/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: file.name.replace(/\.[^/.]+$/, ""),
          s3Key,
          contentType: file.type,
          fileSizeBytes: file.size,
          mediaType: inferMediaType(file.type),
        }),
      });
      if (createRes.ok) {
        const d = await createRes.json();
        const asset = d.data ?? d;
        setAssets((prev) => [asset, ...prev]);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(assetId: string) {
    const res = await fetch(`/api/content-studio/assets/${assetId}`, {
      method: "DELETE",
    });
    if (res.ok) setAssets((prev) => prev.filter((a) => a.id !== assetId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx"
            className="hidden"
            onChange={handleUpload}
          />
          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            {uploading ? "Uploading…" : "Upload"}
          </span>
        </label>

        <select
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
          <option value="document">Documents</option>
        </select>
      </div>

      {/* Grid */}
      {assets.length === 0 ? (
        <div className="py-16 text-center">
          <ImageIcon className="mx-auto mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No media yet. Upload files to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => {
            const Icon = MEDIA_ICONS[asset.media_type] ?? FileText;
            return (
              <Card
                key={asset.id}
                className="cursor-pointer transition hover:ring-2 hover:ring-primary"
                onClick={() => onSelectAsset(asset.id)}
              >
                <CardContent className="flex items-start justify-between px-4 py-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{asset.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {asset.media_type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {(asset.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                      {asset.tags.length > 0 && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {asset.tags.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(asset.id);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

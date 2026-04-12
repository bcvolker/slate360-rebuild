"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Upload, Trash2, Loader2, Settings, FileBox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModelSettingsPanel } from "./ModelSettingsPanel";

const ModelViewerClient = dynamic(
  () => import("@/components/ModelViewerClient"),
  { ssr: false },
);

interface ModelData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  model_type: string;
}

interface FileData {
  id: string;
  filename: string;
  s3_key: string;
  content_type: string;
  file_size_bytes: number;
  file_role: string;
}

interface ModelEditorClientProps {
  modelId: string;
  onBack: () => void;
}

export function ModelEditorClient({ modelId, onBack }: ModelEditorClientProps) {
  const [model, setModel] = useState<ModelData | null>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [modelRes, filesRes] = await Promise.all([
        fetch(`/api/design-studio/models/${modelId}`),
        fetch(`/api/design-studio/models/${modelId}/files`),
      ]);
      if (modelRes.ok) {
        const d = await modelRes.json();
        setModel(d.data ?? d);
      }
      if (filesRes.ok) {
        const d = await filesRes.json();
        setFiles(d.data ?? d ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // 1. Get presigned URL
      const urlRes = await fetch(`/api/design-studio/models/${modelId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
      });
      if (!urlRes.ok) return;
      const { data: urlData } = await urlRes.json();

      // 2. Upload to S3
      await fetch(urlData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      // 3. Complete
      const completeRes = await fetch(
        `/api/design-studio/models/${modelId}/files/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            s3Key: urlData.s3Key,
            contentType: file.type,
            size: file.size,
          }),
        },
      );
      if (completeRes.ok) {
        const { data: newFile } = await completeRes.json();
        setFiles((prev) => [...prev, newFile]);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeleteFile(fileId: string) {
    const res = await fetch(
      `/api/design-studio/models/${modelId}/files/${fileId}`,
      { method: "DELETE" },
    );
    if (res.ok) setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }

  async function handleSaveSettings(title: string, description: string, status: string) {
    if (!model) return;
    setSaving(true);
    const res = await fetch(`/api/design-studio/models/${modelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, status }),
    });
    if (res.ok) {
      setModel({ ...model, title, description, status });
      setShowSettings(false);
    }
    setSaving(false);
  }

  // Find first GLB/GLTF file for the 3D viewer
  const viewableFile = files.find((f) =>
    f.filename.match(/\.(glb|gltf|usdz)$/i),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!model) return <p className="text-center text-sm text-muted-foreground">Model not found.</p>;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 size-4" /> Models
          </Button>
          <h2 className="text-lg font-bold">{model.title}</h2>
          <Badge variant={model.status === "active" ? "default" : "secondary"}>
            {model.status}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
          <Settings className="mr-1 size-3.5" /> Settings
        </Button>
      </div>

      {showSettings && (
        <ModelSettingsPanel
          title={model.title}
          description={model.description ?? ""}
          status={model.status}
          saving={saving}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Main layout: file list + viewer */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* File sidebar */}
        <div className="flex w-64 shrink-0 flex-col gap-2 overflow-y-auto">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".glb,.gltf,.usdz,.fbx,.obj,.ifc,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleUpload}
            />
            <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-3 py-3 text-sm text-muted-foreground transition hover:border-primary hover:text-primary">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {uploading ? "Uploading…" : "Add File"}
            </div>
          </label>

          {files.map((file) => (
            <Card key={file.id} className="transition">
              <CardContent className="flex items-center gap-2 px-3 py-2">
                <FileBox className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{file.filename}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(file.file_size_bytes / (1024 * 1024)).toFixed(1)} MB · {file.file_role}
                  </p>
                </div>
                <Button variant="ghost" size="icon-xs" className="shrink-0 text-destructive"
                        onClick={() => handleDeleteFile(file.id)}>
                  <Trash2 className="size-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 3D Viewer */}
        <div className="flex-1 overflow-hidden rounded-lg bg-zinc-900">
          {viewableFile ? (
            <ModelViewerClient src={viewableFile.s3_key} alt={model.title} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              <div className="text-center">
                <FileBox className="mx-auto mb-2 size-8" />
                <p>Upload a .glb or .gltf file to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

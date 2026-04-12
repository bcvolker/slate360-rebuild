"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Loader2, Box, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Model {
  id: string;
  title: string;
  description: string | null;
  status: string;
  model_type: string;
  created_at: string;
}

interface ModelListClientProps {
  projectId: string;
  onSelectModel: (id: string) => void;
}

export function ModelListClient({ projectId, onSelectModel }: ModelListClientProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/design-studio/models?projectId=${projectId}`);
      if (res.ok) {
        const d = await res.json();
        setModels(d.data ?? d ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/design-studio/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title: newTitle.trim() }),
      });
      if (res.ok) {
        const d = await res.json();
        const model = d.data ?? d;
        setModels((prev) => [model, ...prev]);
        setNewTitle("");
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(modelId: string) {
    const res = await fetch(`/api/design-studio/models/${modelId}`, { method: "DELETE" });
    if (res.ok) setModels((prev) => prev.filter((m) => m.id !== modelId));
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
      <div className="flex items-center gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New model name"
          className="max-w-xs"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <Button size="sm" onClick={handleCreate} disabled={creating || !newTitle.trim()}>
          {creating ? <Loader2 className="size-4 animate-spin" /> : <><Plus className="mr-1 size-3.5" /> Create</>}
        </Button>
      </div>

      {models.length === 0 ? (
        <div className="py-16 text-center">
          <Box className="mx-auto mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No models yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => (
            <Card key={model.id} className="cursor-pointer transition hover:ring-2 hover:ring-primary"
                  onClick={() => onSelectModel(model.id)}>
              <CardContent className="flex items-start justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{model.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{model.model_type}</Badge>
                    <Badge variant={model.status === "active" ? "default" : "outline"} className="text-[10px]">
                      {model.status}
                    </Badge>
                  </div>
                  {model.description && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{model.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon-xs" className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDelete(model.id); }}>
                    <Trash2 className="size-3.5" />
                  </Button>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface ModelSettingsPanelProps {
  title: string;
  description: string;
  status: string;
  saving: boolean;
  onSave: (title: string, description: string, status: string) => void;
  onClose: () => void;
}

export function ModelSettingsPanel({
  title: initialTitle,
  description: initialDesc,
  status: initialStatus,
  saving,
  onSave,
  onClose,
}: ModelSettingsPanelProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDesc);
  const [status, setStatus] = useState(initialStatus);

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <h3 className="font-semibold">Model Settings</h3>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Model title" />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
        <select
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onSave(title, description, status)}
                  disabled={saving || !title.trim()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

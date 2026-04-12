"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface TourSettingsPanelProps {
  title: string;
  description: string;
  saving: boolean;
  onSave: (title: string, description: string) => void;
  onClose: () => void;
}

export function TourSettingsPanel({
  title: initialTitle,
  description: initialDesc,
  saving,
  onSave,
  onClose,
}: TourSettingsPanelProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDesc);

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <h3 className="font-semibold">Tour Settings</h3>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tour title" />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onSave(title, description)} disabled={saving || !title.trim()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

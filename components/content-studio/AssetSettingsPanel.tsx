"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AssetSettingsPanelProps {
  title: string;
  tags: string[];
  saving: boolean;
  onSave: (title: string, tags: string[]) => void;
  onClose: () => void;
}

export function AssetSettingsPanel({
  title: initialTitle,
  tags: initialTags,
  saving,
  onSave,
  onClose,
}: AssetSettingsPanelProps) {
  const [title, setTitle] = useState(initialTitle);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <h3 className="font-semibold">Asset Settings</h3>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Asset title"
        />

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Tags
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add tag…"
              className="max-w-xs"
            />
            <Button size="sm" variant="outline" onClick={addTag} disabled={!tagInput.trim()}>
              Add
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onSave(title, tags)}
            disabled={saving || !title.trim()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

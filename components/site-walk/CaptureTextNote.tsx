"use client";

import { useState } from "react";
import { Send, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import type { SiteWalkItem } from "@/lib/types/site-walk";

type Props = {
  sessionId: string;
  onItemCaptured: (item: SiteWalkItem) => void;
};

export function CaptureTextNote({ sessionId, onItemCaptured }: Props) {
  const { position } = useGeolocation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!description.trim()) return;
    setSaving(true);

    try {
      const res = await fetch("/api/site-walk/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          item_type: "text_note",
          title: title.trim() || `Note ${new Date().toLocaleTimeString()}`,
          description: description.trim(),
          latitude: position?.latitude,
          longitude: position?.longitude,
          location_label: locationLabel.trim() || undefined,
          metadata: { captured_at: new Date().toISOString() },
        }),
      });
      if (res.ok) {
        const { item } = await res.json();
        onItemCaptured(item);
        setTitle("");
        setDescription("");
        setLocationLabel("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Input
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <Textarea
        placeholder="Describe what you see..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={6}
        className="resize-none"
        autoFocus
      />

      <div className="flex items-center gap-2">
       <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="Location / area label"
          value={locationLabel}
          onChange={(e) => setLocationLabel(e.target.value)}
          className="flex-1"
        />
      </div>

      {position && (
        <p className="text-xs text-muted-foreground">
          GPS: {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
        </p>
      )}

      <Button onClick={handleSave} disabled={!description.trim() || saving}>
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        Save Note
      </Button>
    </div>
  );
}

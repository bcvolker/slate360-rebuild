"use client";

import { useState } from "react";
import {
  Camera,
  StickyNote,
  Video,
  Mic,
  Pencil,
  Trash2,
  MapPin,
  GripVertical,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SiteWalkItem, SiteWalkItemType } from "@/lib/types/site-walk";

const TYPE_ICON: Record<SiteWalkItemType, React.ReactNode> = {
  photo: <Camera className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  text_note: <StickyNote className="h-4 w-4" />,
  voice_note: <Mic className="h-4 w-4" />,
  annotation: <Pencil className="h-4 w-4" />,
};

const TYPE_LABEL: Record<SiteWalkItemType, string> = {
  photo: "Photo",
  video: "Video",
  text_note: "Note",
  voice_note: "Voice",
  annotation: "Annotation",
};

type Props = {
  items: SiteWalkItem[];
  onDelete: (id: string) => void;
};

export function ItemTimeline({ items, onDelete }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/site-walk/items/${id}`, { method: "DELETE" });
    if (res.ok) onDelete(id);
    setDeleting(null);
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <StickyNote className="h-10 w-10" />
        <p className="text-sm">No items yet. Capture a photo or note.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <p className="mb-1 text-xs font-medium text-muted-foreground uppercase">
        {items.length} item{items.length !== 1 ? "s" : ""} captured
      </p>

      {items.map((item, idx) => (
        <Card key={item.id} className="flex items-start gap-3 p-3">
          <div className="flex flex-col items-center gap-1 pt-0.5 text-muted-foreground">
            <GripVertical className="h-4 w-4" />
            <span className="text-[10px]">{idx + 1}</span>
          </div>

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            {TYPE_ICON[item.item_type]}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {item.title || TYPE_LABEL[item.item_type]}
            </p>
            {item.description && (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {item.description}
              </p>
            )}
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{TYPE_LABEL[item.item_type]}</span>
              <span>·</span>
              <span>{new Date(item.captured_at).toLocaleTimeString()}</span>
              {item.location_label && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />
                    {item.location_label}
                  </span>
                </>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
            onClick={() => handleDelete(item.id)}
            disabled={deleting === item.id}
            aria-label="Delete item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </Card>
      ))}
    </div>
  );
}

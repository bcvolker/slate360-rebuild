"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, Globe, FileEdit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProjectTour } from "@/lib/types/tours";

interface TourListClientProps {
  onSelectTour: (tourId: string) => void;
}

export function TourListClient({ onSelectTour }: TourListClientProps) {
  const [tours, setTours] = useState<ProjectTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchTours = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tours");
      if (res.ok) {
        const data = await res.json();
        setTours(data.data ?? data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTours(); }, [fetchTours]);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        const tour = data.data ?? data;
        setNewTitle("");
        setShowCreate(false);
        onSelectTour(tour.id);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(tourId: string) {
    const res = await fetch(`/api/tours/${tourId}`, { method: "DELETE" });
    if (res.ok) setTours((prev) => prev.filter((t) => t.id !== tourId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Your Tours</h2>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="mr-2 size-4" /> New Tour
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Tour title…"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <Button onClick={handleCreate} disabled={creating || !newTitle.trim()} size="sm">
              {creating ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {tours.length === 0 && !showCreate && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No tours yet. Create your first 360° tour to get started.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tours.map((tour) => (
          <Card key={tour.id} className="group relative cursor-pointer transition hover:shadow-md"
                onClick={() => onSelectTour(tour.id)}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{tour.title}</h3>
                <Badge variant={tour.status === "published" ? "default" : "secondary"}>
                  {tour.status === "published" ? (
                    <><Globe className="mr-1 size-3" /> Published</>
                  ) : (
                    <><FileEdit className="mr-1 size-3" /> Draft</>
                  )}
                </Badge>
              </div>
              {tour.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{tour.description}</p>
              )}
              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="xs"
                        onClick={(e) => { e.stopPropagation(); onSelectTour(tour.id); }}>
                  <Eye className="mr-1 size-3" /> Edit
                </Button>
                <Button variant="ghost" size="xs"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(tour.id); }}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

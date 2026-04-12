"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Camera,
  StickyNote,
  FileText,
  Plus,
  CheckCircle,
  Clock,
  MapPin,
} from "lucide-react";
import { SiteWalkHeader } from "@/components/site-walk/SiteWalkNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  SiteWalkSession,
  SiteWalkItem,
  SiteWalkDeliverable,
  SiteWalkItemType,
} from "@/lib/types/site-walk";

const TYPE_ICON: Record<SiteWalkItemType, React.ReactNode> = {
  photo: <Camera className="h-4 w-4" />,
  video: <Camera className="h-4 w-4" />,
  text_note: <StickyNote className="h-4 w-4" />,
  voice_note: <StickyNote className="h-4 w-4" />,
  annotation: <StickyNote className="h-4 w-4" />,
};

type Props = {
  projectId: string;
  projectName: string;
  session: SiteWalkSession;
  items: SiteWalkItem[];
  deliverables: { id: string; title: string; deliverable_type: string; status: string; created_at: string }[];
};

export function SessionReviewClient({
  projectId,
  projectName,
  session,
  items,
  deliverables,
}: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const photoCount = items.filter((i) => i.item_type === "photo" || i.item_type === "video").length;
  const noteCount = items.filter((i) => i.item_type === "text_note" || i.item_type === "voice_note").length;

  async function createReport() {
    setCreating(true);
    try {
      const res = await fetch("/api/site-walk/deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          deliverable_type: "report",
          title: `${session.title} — Report`,
        }),
      });
      if (res.ok) {
        const { deliverable } = await res.json();
        router.push(`/site-walk/${projectId}/deliverables/new?deliverableId=${deliverable.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <SiteWalkHeader
        title="Session Review"
        backHref={`/site-walk/${projectId}/sessions`}
      />

      <main className="flex-1 space-y-6 px-4 pb-6 pt-4">
        {/* Session info */}
        <div>
          <h2 className="text-lg font-semibold">{session.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {session.status === "completed" ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              <span className="capitalize">{session.status.replace("_", " ")}</span>
            </span>
            <span>{new Date(session.created_at).toLocaleDateString()}</span>
            {session.started_at && (
              <span>Started {new Date(session.started_at).toLocaleTimeString()}</span>
            )}
            {session.completed_at && (
              <span>Ended {new Date(session.completed_at).toLocaleTimeString()}</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{items.length}</p>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{photoCount}</p>
            <p className="text-xs text-muted-foreground">Photos</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{noteCount}</p>
            <p className="text-xs text-muted-foreground">Notes</p>
          </Card>
        </div>

        {/* Items list */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Captured Items</h3>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <Card key={item.id} className="flex items-center gap-3 p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {idx + 1}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary">
                  {TYPE_ICON[item.item_type]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.title || item.item_type}</p>
                  {item.location_label && (
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {item.location_label}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Deliverables */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">Deliverables</h3>
            <Button size="sm" variant="outline" onClick={createReport} disabled={creating}>
              <Plus className="mr-1 h-3 w-3" /> New Report
            </Button>
          </div>
          {deliverables.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No deliverables yet. Create a report to compile your findings.
            </p>
          ) : (
            <div className="space-y-2">
              {deliverables.map((d) => (
                <Link key={d.id} href={`/site-walk/${projectId}/deliverables/new?deliverableId=${d.id}`}>
                  <Card className="flex items-center gap-3 p-3 hover:bg-accent">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.title}</p>
                      <p className="text-xs capitalize text-muted-foreground">{d.status}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Resume capture button */}
        {session.status !== "completed" && (
          <Link href={`/site-walk/${projectId}/sessions/${session.id}`}>
            <Button className="w-full">
              <Camera className="mr-2 h-4 w-4" /> Resume Capture
            </Button>
          </Link>
        )}
      </main>
    </>
  );
}

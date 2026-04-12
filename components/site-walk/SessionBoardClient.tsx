"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ClipboardList,
  Loader2,
  Package,
} from "lucide-react";
import { SiteWalkHeader } from "@/components/site-walk/SiteWalkNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type BoardSession = {
  id: string;
  project_id: string;
  title: string;
  status: string;
  created_by: string;
  created_at: string;
  item_count: number;
  open_assignments: number;
  escalation_count: number;
};

export function SessionBoardClient() {
  const [sessions, setSessions] = useState<BoardSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/site-walk/board");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <>
        <SiteWalkHeader title="Session Board" backHref="/site-walk" />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <SiteWalkHeader title="Session Board" backHref="/site-walk" />
      <main className="flex-1 space-y-4 px-4 pb-6 pt-4">
        {sessions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No active sessions found.
          </p>
        ) : (
          sessions.map((s) => (
            <Link
              key={s.id}
              href={`/site-walk/${s.project_id}/sessions/${s.id}/review`}
            >
              <Card className="mb-2 flex items-start gap-3 p-4 hover:bg-accent">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.title}</p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                    {s.status.replace("_", " ")} · {new Date(s.created_at).toLocaleDateString()}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" /> {s.item_count} items
                    </span>
                    {s.open_assignments > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <ClipboardList className="h-3 w-3" /> {s.open_assignments} open
                      </span>
                    )}
                    {s.escalation_count > 0 && (
                      <Badge variant="destructive" className="flex items-center gap-1 text-[10px]">
                        <AlertTriangle className="h-3 w-3" /> {s.escalation_count} escalation{s.escalation_count > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </main>
    </>
  );
}

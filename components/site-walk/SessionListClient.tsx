"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClipboardList, Plus, Play, CheckCircle } from "lucide-react";
import { SiteWalkHeader } from "@/components/site-walk/SiteWalkNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Session = {
  id: string;
  title: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft: <ClipboardList className="h-4 w-4 text-muted-foreground" />,
  in_progress: <Play className="h-4 w-4 text-amber-500" />,
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
};

export function SessionListClient({
  projectId,
  projectName,
  sessions: initial,
}: {
  projectId: string;
  projectName: string;
  sessions: Session[];
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initial);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function createSession() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/site-walk/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, title: title.trim() }),
      });
      if (!res.ok) return;
      const { session } = await res.json();
      setSessions((prev) => [session, ...prev]);
      setOpen(false);
      setTitle("");
      router.push(`/site-walk/${projectId}/sessions/${session.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <SiteWalkHeader
        title={projectName}
        backHref="/site-walk"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> New
          </Button>
        }
      />

      <main className="flex-1 px-4 pb-6 pt-4">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <ClipboardList className="h-10 w-10" />
            <p className="text-sm">No sessions yet. Tap New to start one.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {sessions.map((s) => (
              <Link key={s.id} href={`/site-walk/${projectId}/sessions/${s.id}`}>
                <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-accent">
                  {STATUS_ICON[s.status] ?? STATUS_ICON.draft}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                      {" · "}
                      <span className="capitalize">{s.status.replace("_", " ")}</span>
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Site Walk Session</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="e.g. Floor 3 Inspection"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createSession()}
            autoFocus
          />
          <DialogFooter>
            <Button onClick={createSession} disabled={!title.trim() || creating}>
              {creating ? "Creating…" : "Create Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

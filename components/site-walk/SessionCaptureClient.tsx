"use client";

import { useCallback, useEffect, useState } from "react";
import { Camera, StickyNote, List, CheckCircle, Play } from "lucide-react";
import { SiteWalkHeader } from "@/components/site-walk/SiteWalkNav";
import { Button } from "@/components/ui/button";
import { CaptureCamera } from "@/components/site-walk/CaptureCamera";
import { CaptureTextNote } from "@/components/site-walk/CaptureTextNote";
import { ItemTimeline } from "@/components/site-walk/ItemTimeline";
import type { SiteWalkSession, SiteWalkItem } from "@/lib/types/site-walk";

type Tab = "camera" | "note" | "timeline";

type Props = {
  projectId: string;
  projectName: string;
  session: SiteWalkSession;
  initialItems: SiteWalkItem[];
};

export function SessionCaptureClient({
  projectId,
  projectName,
  session,
  initialItems,
}: Props) {
  const [items, setItems] = useState<SiteWalkItem[]>(initialItems);
  const [activeTab, setActiveTab] = useState<Tab>("camera");
  const [status, setStatus] = useState(session.status);

  const addItem = useCallback((item: SiteWalkItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  useEffect(() => {
    if (status === "draft" && items.length > 0) {
      setStatus("in_progress");
      fetch(`/api/site-walk/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
    }
  }, [items.length, status, session.id]);

  async function completeSession() {
    const res = await fetch(`/api/site-walk/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    if (res.ok) setStatus("completed");
  }

  const tabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: "camera", icon: <Camera className="h-5 w-5" />, label: "Photo" },
    { key: "note", icon: <StickyNote className="h-5 w-5" />, label: "Note" },
    { key: "timeline", icon: <List className="h-5 w-5" />, label: `Items (${items.length})` },
  ];

  return (
    <>
      <SiteWalkHeader
        title={session.title}
        backHref={`/site-walk/${projectId}/sessions`}
        actions={
          status !== "completed" ? (
            <Button size="sm" variant="outline" onClick={completeSession}>
              <CheckCircle className="mr-1 h-4 w-4" /> Complete
            </Button>
          ) : (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-4 w-4" /> Completed
            </span>
          )
        }
      />

      {status === "draft" && (
        <div className="flex items-center gap-2 border-b bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <Play className="h-3 w-3" /> Draft — capture an item to start this session
        </div>
      )}

      <main className="flex-1 overflow-hidden pb-20">
        {activeTab === "camera" && (
          <CaptureCamera sessionId={session.id} onItemCaptured={addItem} />
        )}
        {activeTab === "note" && (
          <CaptureTextNote sessionId={session.id} onItemCaptured={addItem} />
        )}
        {activeTab === "timeline" && (
          <ItemTimeline items={items} onDelete={removeItem} />
        )}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-safe backdrop-blur">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors ${
                activeTab === tab.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ActiveWalkSession, SafeExitTarget, SessionShellContextValue } from "./session-shell-types";
import type { SiteWalkSyncState } from "@/lib/types/site-walk";

const SiteWalkSessionContext = createContext<SessionShellContextValue | null>(null);

type Props = {
  initialSession: ActiveWalkSession;
  children: ReactNode;
};

export function SiteWalkSessionProvider({ initialSession, children }: Props) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [syncState, setSyncState] = useState<SiteWalkSyncState>(initialSession.sync_state);
  const [isOnline, setIsOnline] = useState(true);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline && syncState === "synced") setSyncState("pending");
  }, [isOnline, syncState]);

  function exitWalk(target: SafeExitTarget = "dashboard") {
    router.push(target === "walks" ? "/site-walk/walks" : "/site-walk");
  }

  async function endWalk() {
    setIsEnding(true);
    setSyncState("syncing");
    try {
      const response = await fetch(`/api/site-walk/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", sync_state: "synced", last_synced_at: new Date().toISOString() }),
      });
      if (!response.ok) throw new Error("Could not end walk");
      const data = (await response.json()) as { session?: ActiveWalkSession };
      if (data.session) setSession(data.session);
      setSyncState("synced");
      router.push("/site-walk/walks");
    } catch {
      setSyncState("failed");
    } finally {
      setIsEnding(false);
    }
  }

  const value = useMemo<SessionShellContextValue>(() => ({
    session,
    syncState,
    isOnline,
    isEnding,
    setSyncState,
    exitWalk,
    endWalk,
  }), [isEnding, isOnline, session, syncState]);

  return <SiteWalkSessionContext.Provider value={value}>{children}</SiteWalkSessionContext.Provider>;
}

export function useSiteWalkSession() {
  const value = useContext(SiteWalkSessionContext);
  if (!value) throw new Error("useSiteWalkSession must be used inside SiteWalkSessionProvider");
  return value;
}

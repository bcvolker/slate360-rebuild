"use client";

import { useCallback, useEffect, useState } from "react";

export type CeoSubscriberDirectoryEntry = {
  id: string;
  email: string;
  displayName: string;
  orgId: string | null;
  orgName: string;
  orgTier: string;
  orgRole: string;
  createdAt: string;
  isOwnerAccount: boolean;
  staffId: string | null;
  accessScope: string[];
  hasMarketAccess: boolean;
  hasAthlete360Access: boolean;
};

type UseCeoSubscriberDirectoryReturn = {
  subscribers: CeoSubscriberDirectoryEntry[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useCeoSubscriberDirectory(): UseCeoSubscriberDirectoryReturn {
  const [subscribers, setSubscribers] = useState<CeoSubscriberDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ceo/subscribers", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load subscriber directory");
        return;
      }
      setSubscribers(data.subscribers ?? []);
    } catch {
      setError("Network error loading subscriber directory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { subscribers, loading, error, reload };
}
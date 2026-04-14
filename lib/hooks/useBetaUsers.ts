"use client";

import { useCallback, useEffect, useState } from "react";

export type BetaUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  company: string | null;
  is_beta_approved: boolean;
  created_at: string;
};

export function useBetaUsers() {
  const [users, setUsers] = useState<BetaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/beta");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setUsers(body.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleApproval = useCallback(
    async (userId: string, approved: boolean) => {
      const res = await fetch("/api/admin/beta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, approved }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = await res.json();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_beta_approved: body.user.is_beta_approved } : u,
        ),
      );
      return body.user;
    },
    [],
  );

  return { users, loading, error, reload: fetchUsers, toggleApproval };
}

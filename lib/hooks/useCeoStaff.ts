"use client";

import { useState, useCallback, useEffect } from "react";

export type StaffMember = {
  id: string;
  email: string;
  display_name: string | null;
  granted_by: string;
  granted_at: string;
  revoked_at: string | null;
  access_scope: string[];
  notes: string | null;
};

type UseStaffReturn = {
  staff: StaffMember[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  grantAccess: (payload: {
    email: string;
    displayName?: string;
    accessScope?: string[];
    notes?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  revokeAccess: (staffId: string) => Promise<{ ok: boolean; error?: string }>;
  updateStaff: (
    staffId: string,
    payload: { displayName?: string; accessScope?: string[]; notes?: string },
  ) => Promise<{ ok: boolean; error?: string }>;
};

export function useCeoStaff(): UseStaffReturn {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ceo/staff", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load staff");
        return;
      }
      setStaff(data.staff ?? []);
    } catch {
      setError("Network error loading staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const grantAccess = useCallback(
    async (payload: {
      email: string;
      displayName?: string;
      accessScope?: string[];
      notes?: string;
    }) => {
      try {
        const res = await fetch("/api/ceo/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error ?? "Grant failed" };
        await reload();
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [reload],
  );

  const revokeAccess = useCallback(
    async (staffId: string) => {
      try {
        const res = await fetch(`/api/ceo/staff/${staffId}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error ?? "Revoke failed" };
        await reload();
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [reload],
  );

  const updateStaff = useCallback(
    async (
      staffId: string,
      payload: { displayName?: string; accessScope?: string[]; notes?: string },
    ) => {
      try {
        const res = await fetch(`/api/ceo/staff/${staffId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error ?? "Update failed" };
        await reload();
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [reload],
  );

  return { staff, loading, error, reload, grantAccess, revokeAccess, updateStaff };
}

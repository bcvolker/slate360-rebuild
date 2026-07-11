export type ShareLink = {
  id: string;
  token: string;
  url: string;
  role: "view" | "annotate" | "download";
  label: string | null;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  is_revoked: boolean;
  last_viewed_at: string | null;
  created_at: string;
};

export async function listShareLinks(sessionId: string): Promise<ShareLink[]> {
  try {
    const res = await fetch(`/api/ops/thermal/sessions/${sessionId}/share`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.links ?? []) as ShareLink[];
  } catch {
    return [];
  }
}

export async function createShareLink(
  sessionId: string,
  opts: { role: "view" | "annotate" | "download"; label?: string; expiresAt?: string | null; password?: string | null },
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch("/api/ops/thermal/share/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        role: opts.role,
        label: opts.label,
        expires_at: opts.expiresAt ?? null,
        password: opts.password ?? null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { ok: false, message: (body?.error as string) ?? `Failed (${res.status})` };
    }
    return { ok: true, message: "Link created" };
  } catch {
    return { ok: false, message: "Network error — link not created" };
  }
}

export async function revokeShareLink(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/ops/thermal/share/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type ThermalQuestion = {
  id: string;
  parent_id: string | null;
  author_name: string | null;
  body: string;
  is_owner_reply: boolean;
  status: string;
  capture_id: string | null;
  created_at: string;
};

export async function listQuestions(sessionId: string): Promise<ThermalQuestion[]> {
  try {
    const res = await fetch(`/api/ops/thermal/sessions/${sessionId}/questions`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.questions ?? []) as ThermalQuestion[];
  } catch {
    return [];
  }
}

export async function replyToQuestion(sessionId: string, parentId: string, body: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/ops/thermal/sessions/${sessionId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, parentId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

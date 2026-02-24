"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";

type SubmittalRow = {
  id: string;
  title: string;
  spec_section: string | null;
  status: string;
  created_at: string;
};

export default function ProjectSubmittalsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [rows, setRows] = useState<SubmittalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [specSection, setSpecSection] = useState("");
  const [status, setStatus] = useState("Pending");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/submittals`, { cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as { submittals?: SubmittalRow[]; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load submittals");
      setRows(Array.isArray(payload.submittals) ? payload.submittals : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load submittals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const sendToClient = async (submittalId: string) => {
    if (!projectId) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/external-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "Submittal", targetId: submittalId, expiresInDays: 14 }),
      });

      const payload = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !payload.url) throw new Error(payload.error ?? "Failed to generate link");

      await navigator.clipboard.writeText(payload.url);
      setToast(`Shareable link copied: ${payload.url}`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to generate client link");
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId) return;

    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("spec_section", specSection);
      formData.set("status", status);
      if (attachment) formData.set("file", attachment);

      const res = await fetch(`/api/projects/${projectId}/submittals`, {
        method: "POST",
        body: formData,
      });

      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to create submittal");

      setOpen(false);
      setTitle("");
      setSpecSection("");
      setStatus("Pending");
      setAttachment(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create submittal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Project Submittal Workflow</p>
          <h2 className="text-lg font-black text-gray-900">Submittals</h2>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E64500]"
        >
          <Plus size={14} /> New Submittal
        </button>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">
            <Loader2 size={16} className="mr-2 inline animate-spin" /> Loading submittals…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No submittals yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Spec Section</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3 font-semibold text-gray-800">{row.title}</td>
                  <td className="px-4 py-3 text-gray-700">{row.spec_section || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{row.status}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(row.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void sendToClient(row.id)}
                      className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Send to Client
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{toast}</div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/35" />
          <aside
            onClick={(event) => event.stopPropagation()}
            className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-gray-200 bg-white p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900">Create Submittal</h3>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Spec Section</label>
                <input
                  value={specSection}
                  onChange={(event) => setSpecSection(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="e.g. 03 30 00"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Status</label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option>Pending</option>
                  <option>Approved</option>
                  <option>Revise and Resubmit</option>
                  <option>Rejected</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Attachment</label>
                <input
                  type="file"
                  onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {saving ? "Saving…" : "Create Submittal"}
              </button>
            </form>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
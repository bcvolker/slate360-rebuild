"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";

type TaskRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
};

export default function ProjectSchedulePage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("Not Started");

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule`, { cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as { tasks?: TaskRow[]; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load schedule");
      setRows(Array.isArray(payload.tasks) ? payload.tasks : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          startDate,
          endDate,
          status,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to add task");

      setOpen(false);
      setName("");
      setStartDate("");
      setEndDate("");
      setStatus("Not Started");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Timeline</p>
          <h2 className="text-lg font-black text-gray-900">Schedule</h2>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E64500]"
        >
          <Plus size={14} /> Add Task
        </button>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">
            <Loader2 size={16} className="mr-2 inline animate-spin" /> Loading tasks…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No tasks yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Task Name</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">End Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold text-gray-800">{row.name}</td>
                  <td className="px-4 py-3 text-gray-700">{row.start_date || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{row.end_date || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/35" />
          <div onClick={(event) => event.stopPropagation()} className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900">Add Task</h3>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Task Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {saving ? "Saving…" : "Add Task"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

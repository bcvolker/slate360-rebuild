"use client";

import { useRef, useState } from "react";
import { X, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { type PunchFormData, STATUSES, PRIORITIES, TRADES } from "./_shared";

interface Props {
  form: PunchFormData;
  setForm: React.Dispatch<React.SetStateAction<PunchFormData>>;
  editingId: string | null;
  saving: boolean;
  projectId?: string;
  onSubmit: () => void;
  onClose: () => void;
}

const field = "w-full rounded-xl border border-zinc-700 bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_20%,transparent)] focus:border-[var(--primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed";
const label = "block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5";

export default function PunchListForm({ form, setForm, editingId, saving, projectId, onSubmit, onClose }: Props) {
  const set = (k: keyof PunchFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !projectId) return;
    setUploading(true);
    setUploadError(null);
    const added: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        // 1. reserve a presigned PUT + stable serve URL
        const res = await fetch(`/api/projects/${projectId}/punch-list/photo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        });
        if (!res.ok) { setUploadError("Couldn't start upload."); continue; }
        const { uploadUrl, serveUrl } = (await res.json()) as { uploadUrl: string; serveUrl: string };
        // 2. upload the bytes straight to storage
        const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!put.ok) { setUploadError(`Failed to upload ${file.name}.`); continue; }
        added.push(serveUrl);
      }
      if (added.length) setForm(p => ({ ...p, photos: [...p.photos, ...added] }));
    } catch {
      setUploadError("Something went wrong uploading photos.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const removePhoto = (url: string) => setForm(p => ({ ...p, photos: p.photos.filter(u => u !== url) }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l border-zinc-800 shadow-xl overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-card/95 backdrop-blur px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">{editingId ? "Edit Item" : "New Punch Item"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-card hover:text-foreground transition"><X size={16} /></button>
        </div>
        <div className="space-y-4 p-6">
          <div><label className={label}>Title *</label><input className={field} value={form.title} onChange={set("title")} placeholder="Describe the issue…" /></div>
          <div><label className={label}>Description</label><textarea className={`${field} min-h-[80px] resize-y`} rows={3} value={form.description} onChange={set("description")} placeholder="Additional details…" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={label}>Status</label><select className={field} value={form.status} onChange={set("status")}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className={label}>Priority</label><select className={field} value={form.priority} onChange={set("priority")}>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
          </div>
          <div><label className={label}>Assignee</label><input className={field} value={form.assignee} onChange={set("assignee")} placeholder="Name" /></div>
          <div><label className={label}>Trade / Category</label><select className={field} value={form.trade_category} onChange={set("trade_category")}><option value="">Select trade…</option>{TRADES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><label className={label}>Location / Area</label><input className={field} value={form.location_area} onChange={set("location_area")} placeholder="e.g. 2nd Floor Bathroom" /></div>
          <div><label className={label}>Due Date</label><input type="date" className={field} value={form.due_date} onChange={set("due_date")} /></div>

          {/* Photos */}
          <div>
            <label className={label}>Photos</label>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            {form.photos.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {form.photos.map((url, i) => (
                  <div key={`${url}-${i}`} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-zinc-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      className="absolute inset-0 flex items-center justify-center bg-black/60 text-red-300 opacity-0 transition group-hover:opacity-100"
                      aria-label="Remove photo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading || !projectId}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 bg-card/50 p-6 text-center text-xs font-semibold text-zinc-400 transition hover:border-[var(--primary)] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><ImagePlus size={14} /> Add photos</>}
            </button>
            {uploadError && <p className="mt-1.5 text-xs font-medium text-red-400">{uploadError}</p>}
          </div>
        </div>
        <div className="sticky bottom-0 border-t border-zinc-800 bg-card/95 backdrop-blur px-6 py-4 flex items-center gap-3">
          <button disabled={saving || !form.title.trim()} onClick={onSubmit} className="flex-1 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-foreground hover:bg-[color-mix(in_srgb,var(--primary)_78%,black)] transition disabled:opacity-40">{saving ? "Saving…" : editingId ? "Update" : "Create"}</button>
          <button onClick={onClose} className="rounded-xl border border-zinc-700 bg-card px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition">Cancel</button>
        </div>
      </div>
    </div>
  );
}

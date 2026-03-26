"use client";

import { useState } from "react";
import {
  X, Phone, Mail, Building2, Briefcase, FileText, StickyNote,
  Paperclip, Trash2, Download, Plus, Loader2,
} from "lucide-react";

export interface OrgContact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  title?: string | null;
  notes?: string | null;
  tags?: string[];
  color: string;
  initials: string;
  is_archived?: boolean;
  contact_projects?: Array<{ project_id: string; projects: { id: string; name: string } }>;
  contact_files?: Array<{ id: string; file_name: string; mime_type: string | null; size_bytes: number | null; created_at: string }>;
}

interface Props {
  contact: OrgContact;
  onClose: () => void;
  onUpdate: (updated: OrgContact) => void;
  onDelete: (id: string) => void;
}

export default function ContactDetailPanel({ contact, onClose, onUpdate, onDelete }: Props) {
  const [tab, setTab] = useState<"info" | "files">("info");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: contact.name,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    company: contact.company ?? "",
    title: contact.title ?? "",
    notes: contact.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [files, setFiles] = useState(contact.contact_files ?? []);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      if (res.ok) {
        const { contact: updated } = await res.json() as { contact: OrgContact };
        onUpdate({ ...contact, ...updated });
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
      onDelete(contact.id);
    } finally {
      setDeleting(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/contacts/${contact.id}/files`, { method: "POST", body: fd });
      if (res.ok) {
        const { file: uploaded } = await res.json() as { file: { id: string; file_name: string; mime_type: string | null; size_bytes: number | null; created_at: string } };
        setFiles((prev) => [uploaded, ...prev]);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeleteFile(fileId: string) {
    await fetch(`/api/contacts/${contact.id}/files?fileId=${fileId}`, { method: "DELETE" });
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }

  const fmt = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" onClick={onClose}>
      <div
        className="relative w-full max-w-sm h-full bg-white shadow-2xl border-l border-gray-100 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: contact.color }}
          >
            {contact.initials}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                className="w-full text-sm font-bold text-gray-900 border-b border-[#FF4D00] outline-none bg-transparent pb-0.5"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            ) : (
              <p className="text-sm font-bold text-gray-900 truncate">{contact.name}</p>
            )}
            <p className="text-xs text-gray-400 truncate">{contact.title || contact.email || "No title"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(["info", "files"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                tab === t ? "text-[#FF4D00] border-b-2 border-[#FF4D00]" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t === "files" ? `Files (${files.length})` : "Info"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "info" && (
            <div className="space-y-4">
              {(
                [
                  { key: "email", icon: Mail, label: "Email", type: "email" },
                  { key: "phone", icon: Phone, label: "Phone", type: "tel" },
                  { key: "company", icon: Building2, label: "Company", type: "text" },
                  { key: "title", icon: Briefcase, label: "Title / Role", type: "text" },
                ] as const
              ).map(({ key, icon: Icon, label, type }) => (
                <div key={key}>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    <Icon size={11} /> {label}
                  </label>
                  {editing ? (
                    <input
                      type={type}
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
                      placeholder={label}
                    />
                  ) : (
                    <p className="text-sm text-gray-700">{form[key] || <span className="text-gray-300">—</span>}</p>
                  )}
                </div>
              ))}

              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  <StickyNote size={11} /> Notes
                </label>
                {editing ? (
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] resize-none"
                    placeholder="Notes…"
                  />
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.notes || <span className="text-gray-300">—</span>}</p>
                )}
              </div>

              {/* Projects */}
              {(contact.contact_projects?.length ?? 0) > 0 && (
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Projects</label>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.contact_projects!.map((cp) => (
                      <span key={cp.project_id} className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#6366F1]/10 text-[#6366F1]">
                        {cp.projects.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "files" && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-500 hover:border-[#FF4D00]/40 hover:text-[#FF4D00] cursor-pointer transition-colors">
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
                <span>{uploading ? "Uploading…" : "Attach a file"}</span>
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>

              {files.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">No files attached yet</p>
              )}
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{f.file_name}</p>
                    <p className="text-[10px] text-gray-400">{fmt(f.size_bytes)}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDeleteFile(f.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-100 p-4 flex gap-2">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ backgroundColor: "#FF4D00" }}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : "Save"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Edit
              </button>
              {deleteConfirm ? (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-1.5"
                >
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : "Confirm delete"}
                </button>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="w-10 flex-shrink-0 py-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

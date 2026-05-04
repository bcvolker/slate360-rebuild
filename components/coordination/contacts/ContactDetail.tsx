"use client";

import { Mail, Phone, Tag, FolderOpen } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import type { Contact } from "./types";

interface Props {
  contact: Contact | null;
}

const TAG_COLORS: Record<string, string> = {
  Client:        "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Vendor:        "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Subcontractor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Architect:     "bg-teal-500/20 text-teal-300 border-teal-500/30",
  Team:          "bg-green-500/20 text-green-300 border-green-500/30",
  Inspector:     "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

function TagBadge({ label }: { label: string }) {
  const cls = TAG_COLORS[label] ?? "bg-slate-700/50 text-slate-300 border-slate-600/50";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      <Tag className="h-2.5 w-2.5" />{label}
    </span>
  );
}

export function ContactDetail({ contact }: Props) {
  if (!contact) {
    return (
      <GlassCard className="flex h-full min-h-[300px] flex-col items-center justify-center text-center p-10 border-dashed">
        <p className="font-black text-slate-400">Select a contact</p>
        <p className="mt-1 text-xs text-slate-600">Choose from the list to view details</p>
      </GlassCard>
    );
  }

  const projects = (contact.contact_projects ?? [])
    .map((cp) => cp.projects)
    .filter(Boolean) as { id: string; name: string }[];

  return (
    <GlassCard className="flex h-full flex-col gap-4 overflow-y-auto p-5 no-scrollbar">
      {/* Header */}
      <div className="flex items-start gap-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-white"
          style={{ backgroundColor: contact.color ?? "#D4AF37" }}
        >
          {contact.initials ?? contact.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black text-white">{contact.name}</h2>
          {contact.title && <p className="text-sm font-bold text-slate-400">{contact.title}</p>}
          {contact.company && <p className="text-sm text-slate-500">{contact.company}</p>}
        </div>
      </div>

      {/* Message CTA */}
      <a
        href={contact.email ? `mailto:${contact.email}` : undefined}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-400 transition-colors"
        aria-disabled={!contact.email}
      >
        <Mail className="h-4 w-4" /> Message
      </a>

      {/* Contact info */}
      <section>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Contact Info</p>
        <div className="space-y-2">
          {contact.email ? (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 hover:text-white transition-colors">
              <Mail className="h-4 w-4 shrink-0 text-slate-500" />{contact.email}
            </a>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-700/30 bg-slate-900/30 px-3 py-2 text-xs text-slate-600 italic">
              <Mail className="h-4 w-4 shrink-0" /> No email on file
            </div>
          )}
          {contact.phone ? (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2.5 rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 hover:text-white transition-colors">
              <Phone className="h-4 w-4 shrink-0 text-slate-500" />{contact.phone}
            </a>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-700/30 bg-slate-900/30 px-3 py-2 text-xs text-slate-600 italic">
              <Phone className="h-4 w-4 shrink-0" /> No phone on file
            </div>
          )}
        </div>
      </section>

      {/* Tags */}
      <section>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Tags</p>
        {contact.tags?.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map((t) => <TagBadge key={t} label={t} />)}
          </div>
        ) : (
          <p className="text-xs text-slate-600 italic">No tags assigned</p>
        )}
      </section>

      {/* Associated Projects */}
      <section>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Associated Projects</p>
        {projects.length > 0 ? (
          <div className="space-y-1">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm text-slate-300">
                <FolderOpen className="h-4 w-4 shrink-0 text-slate-500" />{p.name}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-600 italic">No projects linked</p>
        )}
      </section>

      {/* Notes */}
      {contact.notes && (
        <section>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Notes</p>
          <p className="rounded-xl border border-slate-700/40 bg-slate-900/40 px-3 py-2 text-sm leading-relaxed text-slate-400">
            {contact.notes}
          </p>
        </section>
      )}
    </GlassCard>
  );
}

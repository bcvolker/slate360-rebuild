"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Search, UserPlus } from "lucide-react";
import type { SetupContact, SetupProject, SetupStakeholder, SubmitState } from "./setup-types";

type ContactsResponse = { contacts?: SetupContact[]; error?: string };
type StakeholdersResponse = { stakeholders?: SetupStakeholder[]; stakeholder?: SetupStakeholder; error?: string };

type Props = {
  project: SetupProject | null;
  initialContacts: SetupContact[];
};

type Draft = { contactId: string; role: string; name: string; email: string; company: string; phone: string };

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15";

export function StakeholderPicker({ project, initialContacts }: Props) {
  const [contacts, setContacts] = useState(initialContacts);
  const [query, setQuery] = useState("");
  const [stakeholders, setStakeholders] = useState<SetupStakeholder[]>([]);
  const [status, setStatus] = useState<SubmitState>({ kind: "idle" });
  const [draft, setDraft] = useState<Draft>({ contactId: "", role: "Client", name: "", email: "", company: "", phone: "" });

  useEffect(() => { void loadStakeholders(project?.id ?? null); }, [project?.id]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return contacts.slice(0, 8);
    return contacts.filter((contact) => [contact.name, contact.email, contact.company, contact.title].some((value) => value?.toLowerCase().includes(term))).slice(0, 8);
  }, [contacts, query]);

  async function searchContacts(value: string) {
    setQuery(value);
    const response = await fetch(value ? `/api/contacts?q=${encodeURIComponent(value)}` : "/api/contacts", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as ContactsResponse;
    setContacts(data.contacts ?? []);
  }

  function selectContact(contactId: string) {
    const contact = contacts.find((item) => item.id === contactId);
    setDraft({
      contactId,
      role: draft.role,
      name: contact?.name ?? "",
      email: contact?.email ?? "",
      company: contact?.company ?? "",
      phone: contact?.phone ?? "",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return setStatus({ kind: "error", message: "Save or select a project before adding stakeholders." });
    if (!draft.name.trim()) return setStatus({ kind: "error", message: "Stakeholder name is required." });
    setStatus({ kind: "loading", message: "Adding stakeholder…" });
    try {
      const response = await fetch(`/api/projects/${project.id}/management/stakeholders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.name, role: draft.role, email: draft.email, company: draft.company, phone: draft.phone, status: "Active" }),
      });
      if (!response.ok) throw new Error(await readError(response));
      await loadStakeholders(project.id);
      setDraft({ contactId: "", role: "Client", name: "", email: "", company: "", phone: "" });
      setStatus({ kind: "ok", message: "Stakeholder added and project roster read back." });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Could not add stakeholder." });
    }
  }

  async function loadStakeholders(projectId: string | null) {
    setStakeholders([]);
    if (!projectId) return;
    const response = await fetch(`/api/projects/${projectId}/management/stakeholders`, { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as StakeholdersResponse;
    setStakeholders(data.stakeholders ?? []);
  }

  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Stakeholders</p><h2 className="mt-1 text-xl font-black text-slate-900">Contacts to project team</h2><p className="mt-1 text-sm leading-6 text-slate-700">Search Coordination contacts, then write selected people into the project roster.</p></div>
        <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">{project ? project.name : "No project selected"}</span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm font-bold text-slate-900"><span className="mb-1 block">Search contacts</span><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className={`${inputClass} pl-9`} value={query} onChange={(e) => void searchContacts(e.target.value)} placeholder="Owner, architect, inspector…" /></div></label>
          <select value={draft.contactId} onChange={(e) => selectContact(e.target.value)} className={inputClass}><option value="">Use manual entry or pick a contact</option>{filtered.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.company ? ` · ${contact.company}` : ""}</option>)}</select>
          <div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" /><input className={inputClass} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="Role" /><input className={inputClass} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="Email" /><input className={inputClass} value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} placeholder="Company" /></div>
          <button type="submit" disabled={!project || status.kind === "loading"} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60"><UserPlus className="h-4 w-4" /> Add stakeholder</button>
          <StatusMessage status={status} />
        </form>

        <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
          <h3 className="text-sm font-black text-slate-900">Current project roster</h3>
          <div className="mt-3 space-y-2">
            {stakeholders.map((person) => <div key={person.id} className="rounded-xl border border-slate-300 bg-white p-3"><p className="text-sm font-black text-slate-900">{person.name}</p><p className="text-xs text-slate-700">{person.role}{person.company ? ` · ${person.company}` : ""}</p><p className="text-xs text-slate-500">{person.email ?? person.phone ?? "No contact detail"}</p></div>)}
            {stakeholders.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">No stakeholders saved for this project yet.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusMessage({ status }: { status: SubmitState }) { if (status.kind === "idle" || status.kind === "loading") return null; return <p className={`text-sm font-semibold ${status.kind === "ok" ? "text-emerald-700" : "text-rose-700"}`}>{status.message}</p>; }
async function readError(response: Response) { const data = (await response.json().catch(() => null)) as { error?: string } | null; return data?.error ?? "Request failed"; }

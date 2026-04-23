"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, UserPlus, ChevronDown, X, SlidersHorizontal, Users } from "lucide-react";
import WidgetCard from "@/components/widgets/WidgetCard";
import type { WidgetSize } from "@/lib/widgets/widget-meta";
import AddContactModal from "./AddContactModal";
import ContactDetailPanel, { type OrgContact } from "./ContactDetailPanel";

interface Project { id: string; name: string }

interface Props {
  span?: string;
  widgetSize: WidgetSize;
  widgetColor: string;
  onSetSize?: (s: WidgetSize) => void;
  // Contacts from org/project members (populated by the widgets API)
  memberContacts: OrgContact[];
  // Projects list for filter + new contact
  projects?: Project[];
}

export default function ContactsWidget({
  span,
  widgetSize,
  widgetColor,
  onSetSize,
  memberContacts,
  projects = [],
}: Props) {
  // Standalone contacts fetched from org_contacts table
  const [ownContacts, setOwnContacts] = useState<OrgContact[]>([]);
  const [ownLoaded, setOwnLoaded] = useState(false);
  const [ownLoading, setOwnLoading] = useState(false);

  // UI state
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<OrgContact | null>(null);

  // Lazy-load own contacts when widget is first interacted with
  const loadOwnContacts = useCallback(async () => {
    if (ownLoaded || ownLoading) return;
    setOwnLoading(true);
    try {
      const url = projectFilter !== "all"
        ? `/api/contacts?project=${projectFilter}`
        : "/api/contacts";
      const res = await fetch(url);
      if (res.ok) {
        const { contacts } = await res.json() as { contacts: OrgContact[] };
        setOwnContacts(contacts);
      }
    } finally {
      setOwnLoading(false);
      setOwnLoaded(true);
    }
  }, [ownLoaded, ownLoading, projectFilter]);

  // Merge member contacts + own contacts, de-dup by email
  const allContacts = useMemo(() => {
    const seen = new Set<string>();
    const merged: OrgContact[] = [];
    for (const c of [...ownContacts, ...memberContacts]) {
      const key = c.email ? c.email.toLowerCase() : c.id;
      if (!seen.has(key)) { seen.add(key); merged.push(c); }
    }
    return merged;
  }, [ownContacts, memberContacts]);

  const filtered = useMemo(() => {
    let list = allContacts;
    if (projectFilter !== "all") {
      list = list.filter((c) =>
        c.contact_projects?.some((cp) => cp.project_id === projectFilter)
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q) ||
          c.contact_projects?.some((cp) => cp.projects.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allContacts, projectFilter, search]);

  function handleCreated(raw: Record<string, unknown>) {
    const contact = raw as unknown as OrgContact;
    setOwnContacts((prev) => [contact, ...prev]);
  }

  function handleUpdate(updated: OrgContact) {
    setOwnContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelected(updated);
  }

  function handleDelete(id: string) {
    setOwnContacts((prev) => prev.filter((c) => c.id !== id));
    setSelected(null);
  }

  const activeProject = projects.find((p) => p.id === projectFilter);

  return (
    <>
      <WidgetCard
        icon={Users}
        title="Contacts"
        span={span}
        delay={300}
        color={widgetColor}
        onSetSize={onSetSize}
        size={widgetSize}
        action={
          <button
            onClick={() => { setAddOpen(true); void loadOwnContacts(); }}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#3B82F6] hover:underline"
          >
            <UserPlus size={12} /> Add
          </button>
        }
      >
        <div className="space-y-3" onFocus={loadOwnContacts} onClick={loadOwnContacts}>
          {/* Search + filter bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search contacts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  <X size={11} />
                </button>
              )}
            </div>
            {projects.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setFilterOpen((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    projectFilter !== "all"
                      ? "border-[#3B82F6] bg-[#3B82F6]/5 text-[#3B82F6]"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <SlidersHorizontal size={12} />
                  {activeProject ? activeProject.name : "All"}
                </button>
                {filterOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setFilterOpen(false)} />
                    <div className="absolute right-0 top-9 w-48 bg-white rounded-xl border border-gray-100 shadow-xl z-40 overflow-hidden">
                      <button
                        onClick={() => { setProjectFilter("all"); setFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${projectFilter === "all" ? "bg-[#3B82F6]/5 text-[#3B82F6] font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
                      >
                        All projects
                      </button>
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setProjectFilter(p.id); setFilterOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${projectFilter === p.id ? "bg-[#3B82F6]/5 text-[#3B82F6] font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Contact count */}
          {(allContacts.length > 0 || search) && (
            <p className="text-[10px] text-gray-400">
              {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
              {search && ` for "${search}"`}
              {activeProject && ` in ${activeProject.name}`}
            </p>
          )}

          {/* Contact list */}
          <div className="space-y-1 max-h-[240px] overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.id || c.name}
                onClick={() => setSelected(c)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-foreground text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: c.color }}
                >
                  {c.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-[#3B82F6] transition-colors">
                    {c.name}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">{c.title || c.company || ""}</p>
                </div>
                {c.contact_projects?.[0] ? (
                  <span className="text-[9px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0 max-w-[80px] truncate">
                    {c.contact_projects[0].projects?.name ?? ""}
                  </span>
                ) : (c as OrgContact & { project?: string }).project ? (
                  <span className="text-[9px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0 max-w-[80px] truncate">
                    {(c as OrgContact & { project?: string }).project}
                  </span>
                ) : null}
              </button>
            ))}

            {filtered.length === 0 && !ownLoading && (
              <div className="text-center py-6">
                <p className="text-xs text-gray-400">
                  {search ? "No contacts match your search" : "No contacts yet"}
                </p>
                {!search && (
                  <button
                    onClick={() => setAddOpen(true)}
                    className="mt-2 text-xs font-semibold text-[#3B82F6] hover:underline flex items-center gap-1 mx-auto"
                  >
                    <UserPlus size={11} /> Add your first contact
                  </button>
                )}
              </div>
            )}

            {ownLoading && (
              <div className="text-center py-4">
                <div className="w-4 h-4 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin mx-auto" />
              </div>
            )}
          </div>
        </div>
      </WidgetCard>

      {/* Add contact modal */}
      {addOpen && (
        <AddContactModal
          projects={projects}
          onClose={() => setAddOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Contact detail slide-out */}
      {selected && (
        <ContactDetailPanel
          contact={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}

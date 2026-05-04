"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ContactList } from "./contacts/ContactList";
import { ContactDetail } from "./contacts/ContactDetail";
import { AddContactModal } from "./contacts/AddContactModal";
import type { Contact } from "./contacts/types";

interface Props {
  contacts: Contact[];
}

export function ContactsClient({ contacts }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    contacts[0]?.id ?? null
  );
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }, [contacts, query]);

  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  function handleSaved() {
    setAddOpen(false);
    router.refresh();
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-400">
          {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => setAddOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-400 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Contact
        </button>
      </div>

      {/* Split pane */}
      <div className="flex h-[calc(100vh-220px)] min-h-[400px] gap-3">
        {/* Left pane: contact list */}
        <div className="w-[30%] min-w-[200px] shrink-0">
          <ContactList
            contacts={filtered}
            selectedId={selectedId}
            query={query}
            onQueryChange={setQuery}
            onSelect={(c) => setSelectedId(c.id)}
          />
        </div>

        {/* Right pane: detail */}
        <div className="flex-1 overflow-hidden">
          <ContactDetail contact={selected} />
        </div>
      </div>

      {addOpen && (
        <AddContactModal
          onClose={() => setAddOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ClipboardList,
  Plus,
  Trash2,
  Loader2,
  Play,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  SiteWalkTemplate,
  TemplateType,
  ChecklistEntry,
} from "@/lib/types/site-walk";

type Props = {
  sessionId?: string; // if provided, shows "Apply" button
};

export function TemplateManager({ sessionId }: Props) {
  const [templates, setTemplates] = useState<SiteWalkTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [templateType, setTemplateType] = useState<TemplateType>("checklist");
  const [entries, setEntries] = useState<ChecklistEntry[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/site-walk/templates");
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.templates);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  function addEntry() {
    if (!newLabel.trim()) return;
    setEntries((prev) => [...prev, { label: newLabel.trim(), required: false }]);
    setNewLabel("");
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleCreate() {
    if (!title.trim() || entries.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/site-walk/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          template_type: templateType,
          checklist_items: entries,
        }),
      });
      if (res.ok) {
        await fetchTemplates();
        setShowCreate(false);
        setTitle("");
        setEntries([]);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleApply(templateId: string) {
    if (!sessionId) return;
    setApplying(templateId);
    try {
      await fetch(`/api/site-walk/templates/${templateId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } finally {
      setApplying(null);
    }
  }

  async function handleDelete(templateId: string) {
    await fetch(`/api/site-walk/templates/${templateId}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Templates</h3>
        <Button size="sm" variant="outline" onClick={() => setShowCreate((v) => !v)}>
          <Plus className="mr-1 h-3 w-3" /> New Template
        </Button>
      </div>

      {showCreate && (
        <Card className="space-y-3 p-3">
          <Input placeholder="Template title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <Select value={templateType} onValueChange={(v) => setTemplateType(v as TemplateType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="checklist">Checklist</SelectItem>
              <SelectItem value="inspection">Inspection</SelectItem>
              <SelectItem value="punch">Punch</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-1">
            {entries.map((e, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <GripVertical className="h-3 w-3 text-muted-foreground" />
                <span className="flex-1">{e.label}</span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => removeEntry(idx)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Add checklist item"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEntry()}
            />
            <Button size="sm" variant="outline" onClick={addEntry}>Add</Button>
          </div>

          <Button size="sm" onClick={handleCreate} disabled={!title.trim() || entries.length === 0 || creating}>
            {creating ? "Saving…" : "Save Template"}
          </Button>
        </Card>
      )}

      {templates.length === 0 && !showCreate && (
        <p className="py-4 text-center text-sm text-muted-foreground">No templates yet.</p>
      )}

      {templates.map((t) => (
        <Card key={t.id} className="flex items-center gap-3 p-3">
          <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{t.title}</p>
            <p className="text-[11px] text-muted-foreground capitalize">
              {t.template_type} · {t.checklist_items.length} items
            </p>
          </div>
          {sessionId && (
            <Button
              size="sm"
              variant="outline"
              disabled={applying === t.id}
              onClick={() => handleApply(t.id)}
            >
              <Play className="mr-1 h-3 w-3" />
              {applying === t.id ? "Applying…" : "Apply"}
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(t.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </Card>
      ))}
    </div>
  );
}

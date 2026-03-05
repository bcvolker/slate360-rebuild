/**
 * useProjectCrudBase — generic CRUD scaffolding hook for Project Hub tool pages.
 *
 * Eliminates ~80 lines of duplicated fetch/loading/error/form-state
 * code that every tool page (RFIs, Submittals, Punch List, etc.) reimplements.
 *
 * Usage:
 *   const { items, loading, error, formOpen, formData, setFormData,
 *           editingId, openCreate, openEdit, closeForm, submit, remove }
 *     = useProjectCrudBase<RFI, RFIFormData>({
 *         endpoint: `/api/projects/${projectId}/rfis`,
 *         emptyForm: EMPTY_FORM,
 *         formFromItem: (rfi) => ({ subject: rfi.subject, ... }),
 *       });
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface UseProjectCrudBaseOptions<T, F> {
  /** Full API path, e.g. /api/projects/[id]/rfis */
  endpoint: string;
  /** Initial form state for a new item */
  emptyForm: F;
  /** Convert a fetched item to form state for editing */
  formFromItem: (item: T) => F;
  /** If true, skip the initial fetch (useful when endpoint may be undefined) */
  skip?: boolean;
}

export interface UseProjectCrudBaseReturn<T, F> {
  items: T[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  formOpen: boolean;
  formData: F;
  editingId: string | null;
  setFormData: React.Dispatch<React.SetStateAction<F>>;
  openCreate: () => void;
  openEdit: (item: T & { id: string }) => void;
  closeForm: () => void;
  /** POST (create) or PATCH (update) depending on editingId */
  submit: (body: F) => Promise<boolean>;
  /** DELETE by id */
  remove: (id: string) => Promise<boolean>;
  /** Re-fetch items */
  refresh: () => void;
}

export function useProjectCrudBase<T extends { id: string }, F>({
  endpoint,
  emptyForm,
  formFromItem,
  skip = false,
}: UseProjectCrudBaseOptions<T, F>): UseProjectCrudBaseReturn<T, F> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(!skip);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<F>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (skip || !endpoint) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { items?: T[]; error?: string };
      if (json.error) throw new Error(json.error);
      setItems(json.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [endpoint, skip]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormOpen(true);
  }, [emptyForm]);

  const openEdit = useCallback((item: T & { id: string }) => {
    setEditingId(item.id);
    setFormData(formFromItem(item));
    setFormOpen(true);
  }, [formFromItem]);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  }, [emptyForm]);

  const submit = useCallback(async (body: F): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `${endpoint}/${editingId}` : endpoint;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { error?: string; item?: T };
      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);

      if (editingId) {
        setItems((prev) => prev.map((it) => (it.id === editingId ? { ...it, ...json.item } : it)));
      } else {
        setItems((prev) => json.item ? [json.item, ...prev] : prev);
        await fetchItems();
      }
      closeForm();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      return false;
    } finally {
      setSaving(false);
    }
  }, [endpoint, editingId, closeForm, fetchItems]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setItems((prev) => prev.filter((it) => it.id !== id));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      return false;
    } finally {
      setSaving(false);
    }
  }, [endpoint]);

  return {
    items, loading, saving, error,
    formOpen, formData, editingId,
    setFormData, openCreate, openEdit, closeForm,
    submit, remove, refresh: fetchItems,
  };
}

"use client";

/**
 * useProtectedDelete — universal deletion-with-confirmation hook.
 *
 * Pairs with <DoubleDeleteModal />. Owns the open/close state, the entity
 * payload, and the async DELETE call. Caller passes the per-entity bits.
 *
 * Usage (low-stakes — single photo):
 *   const del = useProtectedDelete<{ id: string }>({
 *     mode: "simple",
 *     buildRequest: ({ id }) => ({
 *       url: `/api/site-walk/items/${id}`,
 *       method: "DELETE",
 *     }),
 *     onSuccess: ({ id }) => removeCapturedItem(id),
 *   });
 *   <button onClick={() => del.request({ id: photo.id })}>Delete</button>
 *   <DoubleDeleteModal {...del.modalProps} title="Delete photo?" description="..." />
 *
 * Usage (high-stakes — project / session):
 *   const del = useProtectedDelete<{ id: string; name: string }>({
 *     mode: "protected",
 *     buildRequest: ({ id, name }) => ({
 *       url: `/api/projects/${id}`,
 *       method: "DELETE",
 *       body: { confirmText: "DELETE", confirmName: name },
 *     }),
 *     onSuccess: () => router.push("/projects"),
 *   });
 *   <button onClick={() => del.request({ id: p.id, name: p.name })}>Delete project</button>
 *   <DoubleDeleteModal {...del.modalProps} mode="protected"
 *     expectedName={del.entity?.name} title="Delete project?"
 *     description={`This permanently removes "${del.entity?.name}" and every file in it.`}
 *   />
 */

import * as React from "react";
import type { DoubleDeleteMode, DoubleDeleteModalProps } from "@/components/shared/DoubleDeleteModal";

export interface ProtectedDeleteRequestSpec {
  url: string;
  method?: "DELETE" | "POST";
  body?: Record<string, unknown>;
}

export interface UseProtectedDeleteOptions<T> {
  mode?: DoubleDeleteMode;
  /** Build the actual fetch request from the entity payload. */
  buildRequest: (entity: T) => ProtectedDeleteRequestSpec;
  /** Called after a successful DELETE. */
  onSuccess?: (entity: T) => void;
  /** Called when the request fails. Default: console.error. */
  onError?: (entity: T, error: unknown) => void;
}

export interface UseProtectedDeleteReturn<T> {
  /** Open the modal pre-loaded with this entity. */
  request: (entity: T) => void;
  /** The entity currently queued for deletion (or null). */
  entity: T | null;
  /** Spread these into <DoubleDeleteModal>: open + onOpenChange + onConfirm. */
  modalProps: Pick<DoubleDeleteModalProps, "open" | "onOpenChange" | "onConfirm" | "mode">;
  /** True while the DELETE request is in flight. */
  busy: boolean;
}

export function useProtectedDelete<T>({
  mode = "simple",
  buildRequest,
  onSuccess,
  onError,
}: UseProtectedDeleteOptions<T>): UseProtectedDeleteReturn<T> {
  const [entity, setEntity] = React.useState<T | null>(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const request = React.useCallback((next: T) => {
    setEntity(next);
    setOpen(true);
  }, []);

  const onOpenChange = React.useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      // Defer clearing the entity so the modal animates out with its label.
      setTimeout(() => setEntity(null), 200);
    }
  }, []);

  const onConfirm = React.useCallback(async () => {
    if (!entity) return;
    setBusy(true);
    try {
      const spec = buildRequest(entity);
      const res = await fetch(spec.url, {
        method: spec.method ?? "DELETE",
        headers: spec.body ? { "Content-Type": "application/json" } : undefined,
        body: spec.body ? JSON.stringify(spec.body) : undefined,
      });
      if (!res.ok) {
        let message = `Delete failed (${res.status})`;
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) message = j.error;
        } catch {
          // ignore parse error
        }
        throw new Error(message);
      }
      onSuccess?.(entity);
    } catch (err) {
      if (onError) onError(entity, err);
      else console.error("[useProtectedDelete]", err);
      throw err; // surface to modal so it stays open on failure
    } finally {
      setBusy(false);
    }
  }, [entity, buildRequest, onSuccess, onError]);

  return {
    request,
    entity,
    modalProps: { open, onOpenChange, onConfirm, mode },
    busy,
  };
}

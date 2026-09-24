"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CAPABILITY_LABEL,
  CLIENT_CAPABILITY_IDS,
  PORTAL_CAPABILITY_IDS,
  SERVICE_CAPABILITY_IDS,
  type ClientCapabilityId,
} from "@/lib/vnext/scope/capabilities";

const row = "flex h-11 items-center gap-2 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]";

export function VnextScopeEditor({
  projectId,
  included,
  canWrite,
  persist,
}: {
  projectId: string;
  included: readonly ClientCapabilityId[];
  canWrite: boolean;
  persist: "local" | "api";
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ClientCapabilityId[]>([...included]);
  const [message, setMessage] = useState<string | null>(null);
  const includedKey = included.join(",");

  useEffect(() => {
    setSelected(includedKey ? (includedKey.split(",") as ClientCapabilityId[]) : []);
  }, [includedKey]);

  const toggle = (id: ClientCapabilityId) => {
    setSelected((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
    setMessage(null);
  };

  const save = async () => {
    const next = CLIENT_CAPABILITY_IDS.filter((id) => selected.includes(id));
    if (persist === "local") {
      const params = new URLSearchParams();
      params.set("included", next.join(","));
      router.replace(`/preview/vnext/owner/projects/${projectId}?${params.toString()}`, { scroll: false });
      setSelected(next);
      setMessage("Saved for this project.");
      return;
    }
    const response = await fetch(`/api/vnext/projects/${projectId}/scope`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ included: next }),
    });
    if (!response.ok) {
      setMessage("The project scope could not be saved.");
      return;
    }
    setMessage("Saved for this project.");
    router.refresh();
  };

  const group = (title: string, ids: readonly ClientCapabilityId[]) => (
    <fieldset className="mt-4 border-0 p-0">
      <legend className="text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">{title}</legend>
      {ids.map((id) => (
        <label key={id} className={row}>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={selected.includes(id)}
            disabled={!canWrite}
            data-vnext-scope-capability={id}
            onChange={() => toggle(id)}
          />
          {CAPABILITY_LABEL[id]}
        </label>
      ))}
    </fieldset>
  );

  return (
    <div data-vnext-scope-editor={projectId}>
      <h2 className="m-0 mt-6 text-[length:var(--vnext-body)] font-semibold text-[var(--vnext-ink)]">Included in project</h2>
      {group("Services", SERVICE_CAPABILITY_IDS)}
      {group("Portal", PORTAL_CAPABILITY_IDS)}
      {canWrite ? (
        <button type="button" className="mt-3 h-11 min-w-[44px] border border-[var(--vnext-line)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" data-vnext-scope-save="true" onClick={() => void save()}>
          Save
        </button>
      ) : (
        <p className="mt-3 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">You can view this scope. Saving requires project access to change it.</p>
      )}
      {message ? <p className="mt-2 text-[length:var(--vnext-meta)] text-[var(--vnext-ink)]" data-vnext-scope-message="true">{message}</p> : null}
    </div>
  );
}

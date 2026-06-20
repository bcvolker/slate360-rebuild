"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { DesignVariant } from "@/lib/design-studio/internal-types";
import { DesignViewer } from "./DesignViewer";

/** Side-by-side comparison of two ready variants. */
export function CompareView({ sessionId, variants }: { sessionId: string; variants: DesignVariant[] }) {
  const ready = variants.filter((v) => v.status === "ready");
  const [leftId, setLeftId] = useState<string | null>(ready[0]?.id ?? null);
  const [rightId, setRightId] = useState<string | null>(ready[1]?.id ?? ready[0]?.id ?? null);

  if (ready.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-600">
        Generate at least one variant to compare.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-3 py-1.5">
        <VariantSelect label="Left" value={leftId} options={ready} onChange={setLeftId} />
        <VariantSelect label="Right" value={rightId} options={ready} onChange={setRightId} />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2">
        <div className="relative border-r border-white/10">
          <ComparePane sessionId={sessionId} variantId={leftId} />
        </div>
        <div className="relative">
          <ComparePane sessionId={sessionId} variantId={rightId} />
        </div>
      </div>
    </div>
  );
}

function VariantSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: DesignVariant[];
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-[11px] text-slate-400">
      {label}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-white/10 bg-[#0B0F15] px-2 py-1 text-[11px] text-slate-200"
      >
        {options.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label ?? v.tier}
          </option>
        ))}
      </select>
    </label>
  );
}

function ComparePane({ sessionId, variantId }: { sessionId: string; variantId: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!variantId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/design-studio/sessions/${sessionId}/asset-url?variantId=${variantId}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setUrl(d.url ?? null))
      .catch(() => !cancelled && setUrl(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [sessionId, variantId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-500">
        <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!url) {
    return <div className="flex h-full items-center justify-center text-xs text-slate-600">No preview</div>;
  }
  return <DesignViewer src={url} alt="Variant" />;
}

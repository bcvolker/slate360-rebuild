"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";

type Measurement = {
  id: string;
  label: string;
  measured_value: number | null;
  unit: string;
  metadata: { approximate?: boolean; author_display?: string } | null;
  created_at: string;
};

export function TwinMeasurementsList({
  spaceId,
  refreshToken = 0,
}: {
  spaceId: string;
  refreshToken?: number;
}) {
  const [rows, setRows] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/digital-twin/measurements?space_id=${spaceId}`);
      const data = (await res.json().catch(() => ({}))) as {
        measurements?: Measurement[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Could not load measurements");
      setRows(data.measurements ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  return (
    <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="mb-3 flex items-center gap-2">
        <Ruler className={cn("size-4", twinAccent.text)} aria-hidden />
        <h2 className="text-sm font-semibold text-zinc-100">Measurements</h2>
        {loading ? <Loader2 className={cn("size-4 animate-spin", twinAccent.spinner)} aria-hidden /> : null}
      </div>

      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      {rows.length === 0 && !loading ? (
        <p className="text-xs text-zinc-500">No measurements saved yet.</p>
      ) : null}

      <ul className="max-h-48 space-y-2 overflow-y-auto">
        {rows.map((m) => (
          <li
            key={m.id}
            className="rounded-lg border border-white/[0.06] bg-[#0B0F15]/40 px-2.5 py-2 text-xs text-zinc-300"
          >
            <p className="font-semibold text-zinc-200">
              {m.measured_value !== null
                ? `${m.measured_value.toFixed(2)} ${m.unit}`
                : "—"}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-500">{m.label}</p>
            {m.metadata?.author_display ? (
              <p className="mt-0.5 text-[10px] text-zinc-500">by {m.metadata.author_display}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

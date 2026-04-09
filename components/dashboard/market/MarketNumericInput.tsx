"use client";

import React, { useEffect, useState } from "react";

interface MarketNumericInputProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  fallback: number;
  onCommit: (value: number) => void;
}

function clamp(value: number, min?: number, max?: number) {
  let next = value;
  if (typeof min === "number") next = Math.max(min, next);
  if (typeof max === "number") next = Math.min(max, next);
  return next;
}

export default function MarketNumericInput({
  value,
  min,
  max,
  step,
  fallback,
  onCommit,
}: MarketNumericInputProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const normalized = clamp(parsed, min, max);
    onCommit(normalized || fallback);
    setDraft(String(normalized || fallback));
  };

  return (
    <input
      type="text"
      inputMode={step && step < 1 ? "decimal" : "numeric"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#D4AF37]"
    />
  );
}

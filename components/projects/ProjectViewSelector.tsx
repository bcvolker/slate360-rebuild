"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Mode = "my" | "owner" | "leadership";

const OPTIONS: Array<{ value: Mode; label: string; hint: string }> = [
  { value: "my", label: "My view", hint: "Your default working view" },
  { value: "owner", label: "Owner view", hint: "What the project owner sees" },
  { value: "leadership", label: "Leadership view", hint: "Read-only summary for org leaders" },
];

type Props = {
  initial: Mode;
  /** Hide modes the current user cannot use (e.g. non-leaders can't pick "leadership"). */
  allowed?: Mode[];
};

export function ProjectViewSelector({ initial, allowed }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initial);
  const [pending, startTransition] = useTransition();

  const visible = OPTIONS.filter((o) => !allowed || allowed.includes(o.value));

  const onChange = (next: Mode) => {
    setMode(next);
    startTransition(async () => {
      await fetch("/api/projects/view-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      router.refresh();
    });
  };

  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span>View:</span>
      <select
        value={mode}
        onChange={(e) => onChange(e.target.value as Mode)}
        disabled={pending}
        className="rounded border border-border bg-background px-2 py-1 text-foreground"
      >
        {visible.map((o) => (
          <option key={o.value} value={o.value} title={o.hint}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

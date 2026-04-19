"use client";

import { Construction } from "lucide-react";

interface PlaceholderTabProps {
  title: string;
  description: string;
  fields?: string[];
}

/**
 * Shared placeholder rendered inside My Account tabs whose final content
 * will be designed after the IA + skin are locked in. Keeps the visual
 * shell consistent so IA decisions don't depend on stub content.
 */
export default function PlaceholderTab({ title, description, fields = [] }: PlaceholderTabProps) {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-sm text-zinc-400">{description}</p>
      </header>

      <div className="rounded-2xl border border-app bg-app-card p-6">
        <div className="flex items-center gap-2 mb-4 text-zinc-500">
          <Construction size={16} />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Layout placeholder
          </span>
        </div>
        {fields.length > 0 ? (
          <ul className="space-y-3">
            {fields.map((f) => (
              <li
                key={f}
                className="flex items-center justify-between rounded-xl border border-dashed border-app bg-white/[0.02] px-4 py-3 text-sm text-zinc-300"
              >
                <span>{f}</span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                  pending
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">
            Final content will be populated after the IA + skin lock.
          </p>
        )}
      </div>
    </section>
  );
}

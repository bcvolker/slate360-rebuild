"use client";

import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

interface Props {
  title: string;
  description: string;
  icon: LucideIcon;
  children?: ReactNode;
}

export default function SiteWalkScreenStub({ title, description, icon: Icon, children }: Props) {
  return (
    <div className="min-h-[calc(100vh-160px)] px-4 py-6 max-w-4xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-cobalt/15 border border-cobalt/30 flex items-center justify-center">
            <Icon className="h-5 w-5 text-cobalt" />
          </div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
        </div>
        <p className="text-sm text-slate-400">{description}</p>
      </header>

      {children ?? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-slate-400">
            Coming soon. This screen will be wired in the next Site Walk PR.
          </p>
        </div>
      )}
    </div>
  );
}

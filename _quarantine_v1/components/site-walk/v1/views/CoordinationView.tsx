"use client";

import Link from "next/link";
import {
  ClipboardList,
  MessageSquare,
  Inbox,
  BookUser,
  ChevronRight,
} from "lucide-react";

const sections: {
  icon: typeof ClipboardList;
  label: string;
  desc: string;
  href: string;
}[] = [
  {
    icon: Inbox,
    label: "Inbox",
    desc: "Items needing your attention",
    href: "/coordination/inbox",
  },
  {
    icon: ClipboardList,
    label: "Assignments",
    desc: "Field tasks assigned to you",
    href: "/site-walk/assigned-work",
  },
  {
    icon: MessageSquare,
    label: "Comments",
    desc: "Threaded discussions on walks and items",
    href: "/coordination/inbox",
  },
  {
    icon: BookUser,
    label: "Contacts",
    desc: "Project directory and stakeholders",
    href: "/site-walk/setup",
  },
];

export function CoordinationView() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
      {sections.map(({ icon: Icon, label, desc, href }) => (
        <Link
          key={label}
          href={href}
          className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3 text-left transition-colors hover:bg-white/[0.06]"
        >
          <Icon className="mt-0.5 size-4 shrink-0 text-zinc-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-200">{label}</p>
            <p className="text-xs text-zinc-500">{desc}</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-zinc-600" />
        </Link>
      ))}
    </div>
  );
}

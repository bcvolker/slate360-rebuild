"use client";

import {
  ClipboardList,
  MessageSquare,
  Inbox,
  Users,
  Mail,
  BookUser,
} from "lucide-react";
import type { RouterLike } from "./v1-view-utils";

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
    desc: "Field-to-office task assignments",
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
    href: "/coordination/contacts",
  },
  {
    icon: Users,
    label: "Calendar",
    desc: "Events and schedule",
    href: "/coordination/calendar",
  },
  {
    icon: Mail,
    label: "Invitations",
    desc: "Pending collaborator invitations",
    href: "/settings",
  },
];

export function CoordinationView({ router }: { router: RouterLike }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 p-4">
      {sections.map(({ icon: Icon, label, desc, href }) => (
        <button
          key={label}
          type="button"
          onClick={() => router.push(href)}
          className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3 text-left transition-colors hover:bg-white/[0.06]"
        >
          <Icon className="mt-0.5 size-4 shrink-0 text-zinc-500" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-200">{label}</p>
            <p className="text-xs text-zinc-500">{desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

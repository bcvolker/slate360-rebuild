"use client";

import {
  ClipboardList,
  MessageSquare,
  Inbox,
  Users,
  Mail,
  BookUser,
} from "lucide-react";
import { MobileComingSoonSheet } from "@/components/mobile-system";
import { useState } from "react";

const sections: {
  icon: typeof ClipboardList;
  label: string;
  desc: string;
}[] = [
  {
    icon: Inbox,
    label: "Inbox",
    desc: "Items needing your attention",
  },
  {
    icon: ClipboardList,
    label: "Assignments",
    desc: "Field-to-office task assignments",
  },
  {
    icon: MessageSquare,
    label: "Comments",
    desc: "Threaded discussions on walks and items",
  },
  {
    icon: BookUser,
    label: "Contacts",
    desc: "Project directory and stakeholders",
  },
  {
    icon: Users,
    label: "Calendar",
    desc: "Events and schedule",
  },
  {
    icon: Mail,
    label: "Invitations",
    desc: "Pending collaborator invitations",
  },
];

export function CoordinationView() {
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 p-4">
      {sections.map(({ icon: Icon, label, desc }) => (
        <button
          key={label}
          type="button"
          onClick={() => setComingSoonOpen(true)}
          className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3 text-left transition-colors hover:bg-white/[0.06]"
        >
          <Icon className="mt-0.5 size-4 shrink-0 text-zinc-500" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-200">{label}</p>
            <p className="text-xs text-zinc-500">{desc}</p>
          </div>
        </button>
      ))}

      <MobileComingSoonSheet
        open={comingSoonOpen}
        onOpenChange={setComingSoonOpen}
        title="Coordination on Mobile"
        description="Coordination inbox and calendar stay on desktop during the mobile app rollout. Use Account Hub notifications on mobile for now."
      />
    </div>
  );
}

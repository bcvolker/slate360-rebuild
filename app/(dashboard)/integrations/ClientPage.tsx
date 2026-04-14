"use client";

import DashboardHeader from "@/components/shared/DashboardHeader";
import { Link2 } from "lucide-react";

type IntegrationCard = {
  id: string;
  name: string;
  description: string;
};

const INTEGRATIONS: IntegrationCard[] = [
  {
    id: "microsoft-project",
    name: "Microsoft Project",
    description: "Sync project schedules and milestone updates between Slate360 and Microsoft Project.",
  },
  {
    id: "foundation-software",
    name: "Foundation Software",
    description: "Connect job-cost data and accounting records with bidirectional sync.",
  },
  {
    id: "procore",
    name: "Procore",
    description: "Exchange RFIs, submittals, and progress details across both systems.",
  },
  {
    id: "autodesk",
    name: "Autodesk",
    description: "Bridge design and model context between Autodesk workflows and Slate360.",
  },
];

interface Props {
  user: {name: string, email: string, avatar?: string};
  tier: import("@/lib/entitlements").Tier;
  isCeo?: boolean;
  internalAccess?: { operationsConsole?: boolean };
}

export default function IntegrationsHubPage({ user, tier, isCeo = false, internalAccess }: Props) {
  return (
    <div className="min-h-screen bg-zinc-950">
            <DashboardHeader
        user={user}
        tier={tier}
        isCeo={isCeo}
        internalAccess={internalAccess}
        showBackLink
      />

      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">System Connections</p>
          <h1 className="text-2xl font-black text-zinc-100">Integrations Hub</h1>
          <p className="mt-1 text-sm text-zinc-400">Connect third-party tools to streamline your workflows.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {INTEGRATIONS.map((integration) => {
            return (
              <article key={integration.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="mb-3 inline-flex rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-zinc-400">
                  <Link2 size={16} />
                </div>
                <h2 className="text-base font-black text-zinc-100">{integration.name}</h2>
                <p className="mt-1 text-sm text-zinc-400">{integration.description}</p>

                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-400 cursor-not-allowed">
                    <Link2 size={14} />
                    Coming Soon
                  </span>
                  <span className="text-xs font-semibold text-zinc-500">
                    Not yet available
                  </span>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}

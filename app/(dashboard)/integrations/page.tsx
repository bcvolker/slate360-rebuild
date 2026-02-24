"use client";

import { useState } from "react";
import { CheckCircle2, Link2 } from "lucide-react";

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
    description: "Connect job-cost data and accounting records with bidirectional sync placeholders.",
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

export default function IntegrationsHubPage() {
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">System Connections</p>
        <h1 className="text-2xl font-black text-gray-900">Integrations Hub</h1>
        <p className="mt-1 text-sm text-gray-600">Connect third-party tools using placeholder 2-way sync actions.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {INTEGRATIONS.map((integration) => {
          const isConnected = Boolean(connected[integration.id]);
          return (
            <article key={integration.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-600">
                <Link2 size={16} />
              </div>
              <h2 className="text-base font-black text-gray-900">{integration.name}</h2>
              <p className="mt-1 text-sm text-gray-600">{integration.description}</p>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setConnected((prev) => ({ ...prev, [integration.id]: !prev[integration.id] }))}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#FF4D00] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#E64500]"
                >
                  <CheckCircle2 size={14} />
                  {isConnected ? "Connected" : "Connect (2-Way Sync)"}
                </button>
                <span className={`text-xs font-semibold ${isConnected ? "text-emerald-700" : "text-gray-500"}`}>
                  {isConnected ? "Ready" : "Not connected"}
                </span>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

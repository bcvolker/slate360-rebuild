"use client";

import WidgetCard from "@/components/widgets/WidgetCard";
import type { DashboardAccountOverview } from "@/lib/types/dashboard";
import type { Tier } from "@/lib/entitlements";
import { Activity, FileText, Shield } from "lucide-react";

/* ================================================================
   TYPES
   ================================================================ */

export interface AccountAdminCardsProps {
  accountOverview: DashboardAccountOverview | null;
  storageUsed: number;
  entitlements: { maxStorageGB: number; label: string; tier: Tier };
  isClient: boolean;
  onSetNotice: (notice: { ok: boolean; text: string } | null) => void;
  onCopyText: (value: string, label: string) => void;
  onGenerateApiKey: () => void;
  onRevokeApiKey: (id: string) => void;
  apiKeyLabel: string;
  onApiKeyLabelChange: (value: string) => void;
  apiKeyBusy: "create" | string | null;
  generatedApiKey: string | null;
}

/* ================================================================
   COMPONENT
   ================================================================ */

export default function AccountAdminCards({
  accountOverview,
  storageUsed,
  entitlements: ent,
  isClient,
  onSetNotice,
  onCopyText,
  onGenerateApiKey,
  onRevokeApiKey,
  apiKeyLabel,
  onApiKeyLabelChange,
  apiKeyBusy,
  generatedApiKey,
}: AccountAdminCardsProps) {
  return (
    <>
      <WidgetCard icon={Activity} title="Data & Storage">
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-zinc-400">Storage used</span>
              <span className="text-xs font-bold text-white">
                {(
                  accountOverview?.usage.storageUsedGb ?? storageUsed
                ).toFixed(1)}{" "}
                GB /{" "}
                {(
                  accountOverview?.usage.storageLimitGb ?? ent.maxStorageGB
                ).toLocaleString()}{" "}
                GB
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#3B82F6]"
                style={{
                  width: `${Math.min(((accountOverview?.usage.storageUsedGb ?? storageUsed) / (accountOverview?.usage.storageLimitGb ?? ent.maxStorageGB)) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-white/[0.04]/50 border border-app/50">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Projects
              </p>
              <p className="text-sm font-semibold text-white">
                {(
                  accountOverview?.usage.projectsCount ?? 0
                ).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.04]/50 border border-app/50">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Models
              </p>
              <p className="text-sm font-semibold text-white">
                {(accountOverview?.usage.modelsCount ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.04]/50 border border-app/50">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Tours
              </p>
              <p className="text-sm font-semibold text-white">
                {(accountOverview?.usage.toursCount ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.04]/50 border border-app/50">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Documents
              </p>
              <p className="text-sm font-semibold text-white">
                {(accountOverview?.usage.docsCount ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.04]/50 border border-app/50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Purchased Credits
            </p>
            <p className="text-sm font-semibold text-white">
              {(
                accountOverview?.billing.purchasedCredits ?? 0
              ).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() =>
              onSetNotice({
                ok: true,
                text: "Data export request submitted.",
              })
            }
            className="w-full text-xs font-semibold py-2 rounded-lg border border-app text-zinc-400 hover:bg-white/[0.04] transition-colors"
          >
            Download my data
          </button>
          <button
            onClick={() =>
              onSetNotice({
                ok: false,
                text: "Deletion request started. Support will follow up.",
              })
            }
            className="w-full text-xs font-semibold py-2 rounded-lg border border-red-800/50 text-red-400 hover:bg-red-950/30 transition-colors"
          >
            Request deletion
          </button>
        </div>
      </WidgetCard>

      <WidgetCard
        icon={FileText}
        title="API & Integrations"
        span="md:col-span-2 xl:col-span-2"
      >
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={apiKeyLabel}
              onChange={(e) => onApiKeyLabelChange(e.target.value)}
              placeholder="Key label (e.g. CI Runner)"
              className="flex-1 px-3 py-2 rounded-lg border border-app bg-white/[0.04] text-xs text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
            />
            <button
              onClick={onGenerateApiKey}
              disabled={apiKeyBusy === "create"}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-all disabled:opacity-60"
              style={{ backgroundColor: "#3B82F6" }}
            >
              {apiKeyBusy === "create" ? "Generating…" : "Generate Key"}
            </button>
          </div>
          {generatedApiKey && (
            <div className="p-3 rounded-xl border border-amber-800 bg-amber-950/40">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-1">
                Copy now — shown once
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-amber-300 truncate flex-1">
                  {generatedApiKey}
                </p>
                <button
                  onClick={() => onCopyText(generatedApiKey, "API key")}
                  className="text-[11px] font-semibold text-amber-400 hover:underline"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {(accountOverview?.apiKeys ?? []).length === 0 ? (
              <p className="text-xs text-zinc-500">
                No active API keys yet.
              </p>
            ) : (
              (accountOverview?.apiKeys ?? []).map((key) => (
                <div
                  key={key.id}
                  className="p-3 rounded-xl border border-app/50 bg-white/[0.04]/50 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">
                      {key.label}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      ••••{key.lastFour} ·{" "}
                      {isClient && key.createdAt
                        ? new Date(key.createdAt).toLocaleDateString()
                        : ""}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      onCopyText(`••••${key.lastFour}`, "Key reference")
                    }
                    className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-200"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => onRevokeApiKey(key.id)}
                    disabled={apiKeyBusy === key.id}
                    className="text-[11px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-60"
                  >
                    {apiKeyBusy === key.id ? "Revoking…" : "Revoke"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </WidgetCard>

      <WidgetCard icon={Shield} title="Audit Log">
        <div className="space-y-2">
          {(accountOverview?.auditLog ?? []).length === 0 ? (
            <p className="text-xs text-zinc-500">
              No recent sensitive actions.
            </p>
          ) : (
            (accountOverview?.auditLog ?? []).slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="p-2.5 rounded-lg bg-white/[0.04]/50 border border-app/50"
              >
                <p className="text-xs font-semibold text-zinc-200">
                  {event.action}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {event.actor} ·{" "}
                  {isClient && event.createdAt
                    ? new Date(event.createdAt).toLocaleString()
                    : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </WidgetCard>
    </>
  );
}

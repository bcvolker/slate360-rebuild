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
              <span className="text-xs text-gray-500">Storage used</span>
              <span className="text-xs font-bold text-gray-900">
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
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#FF4D00]"
                style={{
                  width: `${Math.min(((accountOverview?.usage.storageUsedGb ?? storageUsed) / (accountOverview?.usage.storageLimitGb ?? ent.maxStorageGB)) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                Projects
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {(
                  accountOverview?.usage.projectsCount ?? 0
                ).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                Models
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {(accountOverview?.usage.modelsCount ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                Tours
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {(accountOverview?.usage.toursCount ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                Documents
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {(accountOverview?.usage.docsCount ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Purchased Credits
            </p>
            <p className="text-sm font-semibold text-gray-900">
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
            className="w-full text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
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
            className="w-full text-xs font-semibold py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
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
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
            />
            <button
              onClick={onGenerateApiKey}
              disabled={apiKeyBusy === "create"}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-all disabled:opacity-60"
              style={{ backgroundColor: "#FF4D00" }}
            >
              {apiKeyBusy === "create" ? "Generating…" : "Generate Key"}
            </button>
          </div>
          {generatedApiKey && (
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-1">
                Copy now — shown once
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-amber-800 truncate flex-1">
                  {generatedApiKey}
                </p>
                <button
                  onClick={() => onCopyText(generatedApiKey, "API key")}
                  className="text-[11px] font-semibold text-amber-700 hover:underline"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {(accountOverview?.apiKeys ?? []).length === 0 ? (
              <p className="text-xs text-gray-400">
                No active API keys yet.
              </p>
            ) : (
              (accountOverview?.apiKeys ?? []).map((key) => (
                <div
                  key={key.id}
                  className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      {key.label}
                    </p>
                    <p className="text-[10px] text-gray-400">
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
                    className="text-[11px] font-semibold text-gray-500 hover:text-gray-700"
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
            <p className="text-xs text-gray-400">
              No recent sensitive actions.
            </p>
          ) : (
            (accountOverview?.auditLog ?? []).slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="p-2.5 rounded-lg bg-gray-50 border border-gray-100"
              >
                <p className="text-xs font-semibold text-gray-800">
                  {event.action}
                </p>
                <p className="text-[10px] text-gray-400">
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

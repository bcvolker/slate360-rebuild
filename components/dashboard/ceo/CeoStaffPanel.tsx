"use client";

import { useState } from "react";
import {
  UserPlus,
  ShieldAlert,
  MoreVertical,
  X,
  Bot,
  Dumbbell,
  RefreshCw,
} from "lucide-react";
import CeoStaffAddForm from "@/components/dashboard/ceo/CeoStaffAddForm";
import CeoSubscriberDirectory from "@/components/dashboard/ceo/CeoSubscriberDirectory";
import type { StaffMember } from "@/lib/hooks/useCeoStaff";
import type { CeoSubscriberDirectoryEntry } from "@/lib/hooks/useCeoSubscriberDirectory";

const SCOPE_OPTIONS = [
  { id: "market", label: "Market", icon: Bot },
  { id: "athlete360", label: "A360", icon: Dumbbell },
] as const;

type Props = {
  staff: StaffMember[];
  loading: boolean;
  error: string | null;
  subscribers: CeoSubscriberDirectoryEntry[];
  directoryLoading: boolean;
  directoryError: string | null;
  onGrant: (payload: {
    email: string;
    displayName?: string;
    accessScope?: string[];
    notes?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onRevoke: (staffId: string) => Promise<{ ok: boolean; error?: string }>;
  onUpdate: (
    staffId: string,
    payload: { displayName?: string; accessScope?: string[]; notes?: string },
  ) => Promise<{ ok: boolean; error?: string }>;
  onReload: () => Promise<void>;
};

export default function CeoStaffPanel({
  staff,
  loading,
  error,
  subscribers,
  directoryLoading,
  directoryError,
  onGrant,
  onRevoke,
  onUpdate,
  onReload,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeStaff = staff.filter((s) => !s.revoked_at);
  const revokedStaff = staff.filter((s) => s.revoked_at);

  const handleRevoke = async (staffId: string) => {
    const result = await onRevoke(staffId);
    if (!result.ok) setActionError(result.error ?? "Failed to revoke");
    setRevokeConfirm(null);
    setMenuOpen(null);
  };

  const toggleScope = async (member: StaffMember, scopeId: string) => {
    const newScope = member.access_scope.includes(scopeId)
      ? member.access_scope.filter((s) => s !== scopeId)
      : [...member.access_scope, scopeId];
    if (newScope.length === 0) return; // Must have at least one scope
    const result = await onUpdate(member.id, { accessScope: newScope });
    if (!result.ok) {
      setActionError(result.error ?? "Failed to update access scope");
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
            <ShieldAlert size={15} className="text-[#FF6B35]" />
            Internal Staff Access
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Grant selected users access to Market Robot and Athlete360 while keeping the CEO tab owner-only
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReload}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 rounded-lg bg-[#FF4D00] px-3 py-2 text-xs font-bold text-white hover:bg-[#FF4D00]/90 transition-colors"
          >
            <UserPlus size={13} />
            Grant Access
          </button>
        </div>
      </div>

      {/* Add staff form */}
      {showAddForm && (
        <CeoStaffAddForm
          onGrant={onGrant}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <CeoSubscriberDirectory
        subscribers={subscribers}
        staff={staff}
        loading={directoryLoading}
        error={directoryError}
        onGrant={onGrant}
        onRevoke={onRevoke}
        onUpdate={onUpdate}
        onReload={onReload}
      />

      {actionError && (
        <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {actionError}
        </p>
      )}

      {error && (
        <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Active staff list */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : activeStaff.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <UserPlus size={20} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm font-semibold text-gray-600">No staff access granted yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Click &quot;Grant Access&quot; to give a user access to selected internal tabs
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeStaff.map((member) => (
            <div
              key={member.id}
              className="group relative flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:shadow-sm transition-all"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF4D00]/10 text-[#FF4D00] text-xs font-black shrink-0">
                {(member.display_name ?? member.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {member.display_name || member.email}
                </p>
                <p className="text-xs text-gray-500 truncate">{member.email}</p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                {SCOPE_OPTIONS.map(({ id, label, icon: ScopeIcon }) => {
                  const active = member.access_scope.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggleScope(member, id)}
                      title={`${active ? "Remove" : "Add"}: ${label}`}
                      className={`rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${
                        active
                          ? "bg-[#FF4D00]/10 text-[#FF4D00]"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      }`}
                    >
                      <ScopeIcon size={10} className="inline mr-0.5" />
                      {id.toUpperCase()}
                    </button>
                  );
                })}
              </div>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <MoreVertical size={14} />
                </button>
                {menuOpen === member.id && (
                  <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                    <button
                      onClick={() => {
                        setRevokeConfirm(member.id);
                        setMenuOpen(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X size={12} />
                      Revoke Access
                    </button>
                  </div>
                )}
              </div>

              {/* Revoke confirmation */}
              {revokeConfirm === member.id && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/95 backdrop-blur-sm z-20">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-900">
                      Revoke access for {member.display_name || member.email}?
                    </p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setRevokeConfirm(null)}
                        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRevoke(member.id)}
                        className="rounded-md bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Revoked staff (collapsed) */}
      {revokedStaff.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">
            {revokedStaff.length} revoked grant{revokedStaff.length > 1 ? "s" : ""}
          </summary>
          <div className="mt-2 space-y-1.5">
            {revokedStaff.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 opacity-60"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-gray-500 text-xs font-black shrink-0">
                  {(member.display_name ?? member.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-600 truncate">
                    {member.display_name || member.email}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Revoked {new Date(member.revoked_at!).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

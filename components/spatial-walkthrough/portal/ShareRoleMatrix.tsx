"use client";

import {
  SHARE_ACTIONS,
  channelLabel,
  channelSummary,
  guestPermissions,
  memberPermissions,
  publicPermissions,
  type ChannelPermission,
  type ShareAction,
  type ShareChannel,
} from "@/lib/spatial-walkthrough/share-roles";

export function ShareRoleMatrix() {
  const rows: Array<{ channel: ShareChannel; role: string; perms: ChannelPermission }> = [
    { channel: "member", role: "Owner / admin", perms: memberPermissions("admin") },
    { channel: "member", role: "Member", perms: memberPermissions("member") },
    { channel: "member", role: "Collaborator", perms: memberPermissions("collaborator") },
    { channel: "member", role: "Viewer", perms: memberPermissions("viewer") },
    { channel: "guest", role: "Guest link", perms: guestPermissions(true) },
    { channel: "public", role: "Public link", perms: publicPermissions(false) },
  ];

  return (
    <section className="border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Who can do what</p>
        <p className="mt-1 text-sm text-[var(--graphite-muted)]">
          Member access is signed-in. Guest and public are share links, not seats.
        </p>
      </div>
      <div className="space-y-3 p-3 sm:hidden">
        {rows.map((row) => (
          <article key={`${row.channel}-${row.role}`} className="border border-white/10 p-3">
            <p className="text-sm font-semibold text-[var(--graphite-text-header)]">{channelLabel(row.channel)}</p>
            <p className="mt-0.5 text-xs text-[var(--graphite-muted)]">{row.role}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {SHARE_ACTIONS.map((action) => (
                <div key={action} className="flex min-h-11 items-center justify-between gap-2">
                  <dt className="capitalize text-[var(--graphite-muted)]">{action}</dt>
                  <dd>
                    <PermMark allowed={row.perms[action]} action={action} />
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]">
              <th className="px-4 py-2 font-medium">Access</th>
              <th className="px-4 py-2 font-medium">Role</th>
              {SHARE_ACTIONS.map((action) => (
                <th key={action} className="px-4 py-2 font-medium capitalize">{action}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.channel}-${row.role}`} className="border-b border-white/5">
                <td className="px-4 py-3 text-[var(--graphite-text-header)]">{channelLabel(row.channel)}</td>
                <td className="px-4 py-3 text-[var(--graphite-muted)]">{row.role}</td>
                {SHARE_ACTIONS.map((action) => (
                  <td key={action} className="px-4 py-3">
                    <PermMark allowed={row.perms[action]} action={action} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-1 px-4 py-3 text-xs text-[var(--graphite-muted)]">
        <li>{channelSummary("member")}</li>
        <li>{channelSummary("guest")}</li>
        <li>{channelSummary("public")}</li>
      </ul>
    </section>
  );
}

function PermMark({ allowed, action }: { allowed: boolean; action: ShareAction }) {
  return (
    <span className={allowed ? "font-semibold text-[var(--graphite-text-header)]" : "text-[var(--graphite-muted)]"}>
      {allowed ? "Yes" : "No"}
      <span className="sr-only">{` ${action}`}</span>
    </span>
  );
}

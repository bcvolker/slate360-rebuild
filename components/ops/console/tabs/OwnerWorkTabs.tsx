"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { opsConsoleTokens as t } from "@/components/ops/console/ops-console-tokens";
import type { CeoDashboardRow, CeoDashboardWork } from "@/lib/ops-console/work-types";
import { EMPTY_CEO_WORK } from "@/lib/ops-console/work-types";

function Rows({ rows, empty }: { rows: CeoDashboardRow[]; empty: string }) {
  if (!rows.length) return <p className={`mt-3 ${t.emptyNote}`}>{empty}</p>;
  return (
    <ul className="mt-3 space-y-2">
      {rows.map((row) => (
        <li key={row.id} className={t.row}>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--graphite-text-header)]">{row.title}</p>
            <p className="truncate text-xs text-[var(--graphite-muted)]">{row.detail}</p>
          </div>
          {row.href ? (
            <Link href={row.href} className={t.quietAction}>
              Open
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Block({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className={t.card}>
      <p className={t.eyebrow}>{title}</p>
      {note ? <p className={`mt-2 ${t.emptyNote}`}>{note}</p> : null}
      {children}
    </section>
  );
}

export function LeadsTab({ work }: { work: CeoDashboardWork | null }) {
  const data = work ?? EMPTY_CEO_WORK;
  return (
    <Block
      title="Site-visit inquiries"
      note={
        data.leadsAvailable
          ? "Requests saved from the public site-visit form."
          : "Coming online. The inquiry table is not readable yet. New requests still go to email."
      }
    >
      <Rows rows={data.leads} empty="No inquiries saved yet." />
    </Block>
  );
}

export function PortalsTab({ work }: { work: CeoDashboardWork | null }) {
  const data = work ?? EMPTY_CEO_WORK;
  return (
    <Block
      title="Client portals and shares"
      note="Active Twin shares, walkthrough shares, and project portals. A portal link is issued once, so only its prefix is listed."
    >
      <Rows rows={data.portals} empty="No active shares yet." />
    </Block>
  );
}

export function JobsTab({ work }: { work: CeoDashboardWork | null }) {
  const data = work ?? EMPTY_CEO_WORK;
  return (
    <Block title="Jobs" note="Projects on this account. Open one to continue capture work.">
      <Rows rows={data.jobs} empty="No projects yet." />
    </Block>
  );
}

export function DeliverablesTab({ work }: { work: CeoDashboardWork | null }) {
  const data = work ?? EMPTY_CEO_WORK;
  return (
    <Block
      title="Deliverables"
      note="Walkthrough files and twin spaces already on this account. Aerial photo and video are not a separate tracked type yet."
    >
      <Rows rows={data.deliverables} empty="No deliverables or twin spaces yet." />
    </Block>
  );
}

export function CommercialTab({ work }: { work: CeoDashboardWork | null }) {
  const data = work ?? EMPTY_CEO_WORK;
  return (
    <div className="space-y-4">
      <Block title="Quotes" note="Coming online. Quotes are not stored yet.">
        <p className={`mt-3 ${t.emptyNote}`}>No quote records.</p>
      </Block>
      <Block title="Purchase orders" note="Coming online. Purchase orders are not stored yet.">
        <p className={`mt-3 ${t.emptyNote}`}>No purchase orders.</p>
      </Block>
      <Block title="Invoices" note="Invoices already recorded against this account’s projects. Amounts are not shown here.">
        <Rows rows={data.invoices} empty="No invoices recorded." />
      </Block>
    </div>
  );
}

export function ContactsTab({ work }: { work: CeoDashboardWork | null }) {
  const data = work ?? EMPTY_CEO_WORK;
  return (
    <Block title="Client contacts" note="People saved on this account.">
      <Rows rows={data.contacts} empty="No contacts yet." />
      <p className="mt-4">
        <Link href="/coordination/contacts" className={t.quietAction}>
          Open contacts
        </Link>
      </p>
    </Block>
  );
}

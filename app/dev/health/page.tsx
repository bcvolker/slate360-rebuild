import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = { title: "Dev Health — Slate360" };
export const dynamic = "force-dynamic";

/* --------------------------------------------------------------------------
   /dev/health — internal click-test surface.
   One page that lists every nav target, header button, and modal trigger
   in the shell so we can verify the app in 60 seconds instead of stumbling
  on broken bits during real use. Version 1 launch-only, gated to logged-in users.
   ------------------------------------------------------------------------ */

interface Row {
  label: string;
  href?: string;
  /** Free-form expectation so smoke testing has a pass/fail criterion. */
  expect: string;
  /** Mark known-broken or partially shipped surfaces. */
  status?: "ok" | "wip" | "broken";
}

const NAV: Row[] = [
  { label: "Home (marketing)",        href: "/",                       expect: "Hero with cobalt header + 3D model fills its column" },
  { label: "Login",                   href: "/login",                  expect: "Email/password form, no console errors" },
  { label: "Signup",                  href: "/signup",                 expect: "Signup form with full name + org name fields" },
  { label: "Command Center",          href: "/dashboard",              expect: "Greeting 'Welcome back, [name]' (NOT 'your workspace at a glance')" },
  { label: "Site Walk — Walks",       href: "/site-walk/walks",        expect: "Project picker (NOT 'join an organization')" },
  { label: "Site Walk — Deliverables",href: "/site-walk/deliverables", expect: "Deliverables list or empty state" },
  { label: "SlateDrop",               href: "/slatedrop",              expect: "File browser, root folder visible" },
  { label: "Project Hub",             href: "/project-hub",            expect: "Projects list" },
  { label: "Tours",                   href: "/tours",                  expect: "Tours list" },
  { label: "Content Studio",          href: "/content-studio",         expect: "Editor or empty state" },
  { label: "Design Studio",           href: "/design-studio",          expect: "Studio canvas" },
  { label: "Settings",                href: "/settings",               expect: "Account settings tabs" },
  { label: "Billing",                 href: "/settings/billing",       expect: "Subscription + plan info" },
];

const PUBLIC: Row[] = [
  { label: "Privacy",        href: "/privacy",        expect: "Static legal page" },
  { label: "Terms",          href: "/terms",          expect: "Static legal page" },
  { label: "Version 1 Pending", href: "/beta-pending", expect: "Version 1 access gate copy" },
];

const HEADER_ACTIONS: Row[] = [
  { label: "Top header — Invite/Share",    expect: "Opens InviteShareButton modal", status: "wip" },
  { label: "Top header — Version 1 feedback", expect: "Opens feedback drawer",       status: "wip" },
  { label: "Top header — Download app",    expect: "PWA install prompt OR App Store link", status: "broken" },
  { label: "Sidebar — Command Center link",expect: "Visible from every sub-page",    status: "broken" },
  { label: "Homepage CTA when logged in",  expect: "Small 'Dashboard' text link, cobalt hover (NOT giant amber button)" },
];

const APIS: Row[] = [
  { label: "Org context",       href: "/api/org/context",                expect: "{ orgId, user } JSON" },
  { label: "Bootstrap org",     href: "/api/auth/bootstrap-org",         expect: "POST returns { ok: true }" },
  { label: "Storage health",    href: "/api/_diag/storage-runtime",      expect: "{ ok: true, provider: ... }" },
  { label: "Market scheduler",  href: "/api/market/scheduler/tick",      expect: "Cron OK or auth-required" },
];

function StatusPill({ status }: { status?: Row["status"] }) {
  const map: Record<NonNullable<Row["status"]>, string> = {
    ok:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    wip:    "bg-amber-500/15  text-amber-400  border-amber-500/30",
    broken: "bg-red-500/15    text-red-400    border-red-500/30",
  };
  if (!status) return <span className="text-xs text-slate-500">—</span>;
  return (
    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${map[status]}`}>
      {status}
    </span>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</h2>
      <div className="rounded-xl border border-white/10 divide-y divide-white/5 bg-slate-950/50">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-3 p-3">
            <div className="flex-1 min-w-0">
              {r.href ? (
                <Link href={r.href} target="_blank" className="text-sm font-medium text-cobalt hover:underline break-all">
                  {r.label}
                </Link>
              ) : (
                <span className="text-sm font-medium text-slate-200">{r.label}</span>
              )}
              {r.href && <div className="text-[11px] text-slate-500 font-mono mt-0.5">{r.href}</div>}
              <div className="text-xs text-slate-400 mt-1">Expect: {r.expect}</div>
            </div>
            <StatusPill status={r.status} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function DevHealthPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/dev/health");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Dev Health</h1>
          <p className="text-sm text-slate-400">
            One-stop click-test surface for the Slate360 shell. Click each link, verify the &quot;Expect&quot; line, and report any mismatch.
          </p>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            user: {ctx.user.email} · org: {ctx.orgId ?? "(none)"} · tier: {ctx.tier ?? "—"}
          </div>
        </header>

        <Section title="Authenticated routes"  rows={NAV} />
        <Section title="Public routes"         rows={PUBLIC} />
        <Section title="Header & shell actions" rows={HEADER_ACTIONS} />
        <Section title="API health"            rows={APIS} />

        <footer className="text-xs text-slate-600 pt-4 border-t border-white/5">
          Source: <span className="font-mono">app/dev/health/page.tsx</span> · Edit this file when you ship a new shell surface so it stays a real smoke test.
        </footer>
      </div>
    </div>
  );
}

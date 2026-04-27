import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  FileText,
  FolderKanban,
  HardHat,
  Map,
  PlayCircle,
} from "lucide-react";

const isAppStoreMode = process.env.NEXT_PUBLIC_APP_STORE_MODE === "true";

const primaryActions = [
  {
    href: "/site-walk/capture",
    title: "Start Walk",
    description: "Open the field-tested capture shell for camera, plan, voice, and notes.",
    icon: PlayCircle,
    appStoreReady: true,
  },
  {
    href: "/site-walk/setup",
    title: "Create Field Project",
    description: "Set project context, stakeholders, location, and deliverable defaults.",
    icon: HardHat,
    appStoreReady: true,
  },
  {
    href: "/site-walk/plans",
    title: "Master Plan Room",
    description: "Prepare plan sets and reusable sheets before walking the site.",
    icon: Map,
    appStoreReady: false,
  },
  {
    href: "/site-walk/walks",
    title: "Active Walks",
    description: "Resume in-progress walks and review recent field sessions.",
    icon: FolderKanban,
    appStoreReady: true,
  },
  {
    href: "/site-walk/deliverables",
    title: "Deliverables",
    description: "Create hosted previews, client reviews, and export-ready reports.",
    icon: FileText,
    appStoreReady: false,
  },
  {
    href: "/site-walk/assigned-work",
    title: "Assigned Work",
    description: "Focused collaborator path for proof-of-work and task responses.",
    icon: ClipboardCheck,
    appStoreReady: true,
  },
];

const visibleActions = primaryActions.filter((action) => action.appStoreReady || !isAppStoreMode);

export default function SiteWalkPage() {
  return (
    <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-800">
                <HardHat className="h-4 w-4" /> Field-tested workspace
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Site Walk
                </h1>
                <p className="mt-3 text-base leading-7 text-slate-700 sm:text-lg">
                  Capture field truth, coordinate with office support, and turn verified work into branded client deliverables.
                </p>
              </div>
            </div>
            <Link
              href="/site-walk/capture"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
            >
              Start Walk <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section aria-labelledby="site-walk-actions" className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="site-walk-actions" className="text-lg font-black text-slate-950">
                Site Walk actions
              </h2>
              <p className="text-sm text-slate-600">
                Module-specific tools only. Global search, SlateDrop, and app launcher stay in the Slate360 dashboard shell.
              </p>
            </div>
            {isAppStoreMode && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                App Store mode
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group rounded-2xl border border-slate-300 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-800">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-slate-950">{action.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

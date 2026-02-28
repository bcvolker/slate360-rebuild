import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getScopedProjectForUser } from "@/lib/projects/access";
import QuickNav from "@/components/shared/QuickNav";

const TABS = [
  { label: "Overview",   href: "" },
  { label: "Files",      href: "slatedrop" },
  { label: "RFIs",       href: "rfis" },
  { label: "Submittals", href: "submittals" },
  { label: "Daily Logs", href: "daily-logs" },
  { label: "Punch List", href: "punch-list" },
  { label: "Drawings",   href: "drawings" },
  { label: "Photos",     href: "photos" },
  { label: "Budget",     href: "budget" },
  { label: "Schedule",   href: "schedule" },
  { label: "Management", href: "management" },
] as const;

export default async function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/project-hub/${projectId}`)}`);
  }

  const { project: scopedProject } = await getScopedProjectForUser(user.id, projectId, "id, name, status");
  const project = scopedProject as { id: string; name: string; status: string } | null;

  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#ECEEF2]">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-3 sm:py-4 md:px-10">
          {/* Top row: logo + back button + quick nav */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="shrink-0">
                <img src="/logo.svg" alt="Slate360" className="h-7 w-auto" />
              </Link>
              <Link
                href="/project-hub"
                className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#FF4D00] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Project Hub
              </Link>
            </div>
            <QuickNav />
          </div>

          {/* Project header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Project Hub</p>
              <h1 className="text-xl font-black text-gray-900 md:text-2xl">{project.name}</h1>
            </div>
            <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
              {project.status}
            </span>
          </div>

          <nav className="mt-4 overflow-x-auto pb-1 -mx-1">
            <ul className="flex min-w-max items-center gap-1 sm:gap-2 px-1">
              {TABS.map((tab) => {
                const href = tab.href ? `/project-hub/${projectId}/${tab.href}` : `/project-hub/${projectId}`;
                return (
                  <li key={tab.label}>
                    <Link
                      href={href}
                      className="inline-flex rounded-full border border-gray-100 bg-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-gray-700 transition-all hover:border-[#FF4D00]/30 hover:bg-[#FF4D00]/5 hover:text-[#FF4D00] hover:shadow-sm hover:-translate-y-px whitespace-nowrap"
                    >
                      {tab.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 md:px-10 md:py-8">{children}</main>
    </div>
  );
}

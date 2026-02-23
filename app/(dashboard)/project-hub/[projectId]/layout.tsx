import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getScopedProjectForUser } from "@/lib/projects/access";

const TABS = [
  { label: "Overview", href: "" },
  { label: "Files", href: "files" },
  { label: "RFIs", href: "rfis" },
  { label: "Submittals", href: "submittals" },
  { label: "Daily Logs", href: "daily-logs" },
  { label: "Punch List", href: "punch-list" },
  { label: "Drawings", href: "drawings" },
  { label: "Photos", href: "photos" },
  { label: "Budget", href: "budget" },
  { label: "Schedule", href: "schedule" },
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
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-6 py-4 md:px-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Project Hub</p>
              <h1 className="text-xl font-black text-gray-900 md:text-2xl">{project.name}</h1>
            </div>
            <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
              {project.status}
            </span>
          </div>

          <nav className="mt-4 overflow-x-auto pb-1">
            <ul className="flex min-w-max items-center gap-2">
              {TABS.map((tab) => {
                const href = tab.href ? `/project-hub/${projectId}/${tab.href}` : `/project-hub/${projectId}`;
                return (
                  <li key={tab.label}>
                    <Link
                      href={href}
                      className="inline-flex rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
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

      <main className="mx-auto w-full max-w-7xl px-6 py-6 md:px-10 md:py-8">{children}</main>
    </div>
  );
}

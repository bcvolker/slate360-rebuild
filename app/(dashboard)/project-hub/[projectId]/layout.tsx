import DashboardHeader from "@/components/shared/DashboardHeader";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getScopedProjectForUser } from "@/lib/projects/access";

const TABS = [
  { label: "Overview",   href: "" },
  { label: "Files",      href: "slatedrop" },
  { label: "RFIs",       href: "rfis" },
  { label: "Submittals", href: "submittals" },
  { label: "Daily Logs", href: "daily-logs" },
  { label: "Punch List",    href: "punch-list" },
  { label: "Observations",  href: "observations" },
  { label: "Drawings",      href: "drawings" },
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

  const { user, tier, isSlateCeo, canAccessCeo, canAccessMarket, canAccessAthlete360 } = await resolveServerOrgContext();

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
      
      <DashboardHeader
        user={{
          name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
          email: user.email ?? "",
          avatar: user.user_metadata?.avatar_url ?? undefined,
        }}
        tier={tier}
        isCeo={isSlateCeo}
        internalAccess={{ ceo: canAccessCeo, market: canAccessMarket, athlete360: canAccessAthlete360 }}
        showBackLink
      />
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-3 sm:py-4 md:px-10">


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
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 md:px-10 md:py-8">{children}</main>
    </div>
  );
}

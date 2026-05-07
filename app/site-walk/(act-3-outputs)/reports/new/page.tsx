import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ReportBuilderClient } from "@/components/site-walk/reports/ReportBuilderClient";

export const metadata = { title: "Report Builder — Site Walk" };
export const dynamic = "force-dynamic";

export default async function ReportBuilderPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect(`/login?next=/site-walk/reports/new`);

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-white">Deliverable Builder</h1>
          <p className="mt-1 text-sm text-slate-400">Assemble field data into a branded report</p>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ReportBuilderClient />
      </div>
    </div>
  );
}

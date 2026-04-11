import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectScope } from "@/lib/projects/access";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { Film } from "lucide-react";

export default async function VirtualStudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/virtual-studio");

  const { orgId } = await resolveProjectScope(user.id);
  const entitlements = await resolveOrgEntitlements(orgId);

  if (!entitlements.canAccessVirtual) {
    redirect("/dashboard?error=no_virtual_studio");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 text-[#D4AF37]">
          <Film size={32} />
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white">Virtual Studio</h1>
        <p className="mb-2 text-zinc-400">
          Immersive virtual production and visualization tools.
        </p>
        <span className="inline-block rounded-full bg-zinc-800 px-4 py-1.5 text-xs font-semibold text-[#D4AF37]">
          Coming Soon
        </span>
      </div>
    </main>
  );
}

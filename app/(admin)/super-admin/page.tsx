import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Super Admin panel — restricted to users with is_super_admin in user metadata.
 * Middleware enforces the gate at the edge; this is the defence-in-depth check.
 */
export default async function SuperAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isSuperAdmin =
    user.app_metadata?.is_super_admin === true ||
    user.user_metadata?.is_super_admin === true;

  if (!isSuperAdmin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Super Admin Console
        </h1>
        <p className="text-zinc-400">
          This route is restricted to super admins only. Middleware enforces the
          gate at the edge; this page performs a secondary server-side check.
        </p>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">
            Authenticated as:{" "}
            <span className="text-white font-mono">{user.email}</span>
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            User ID:{" "}
            <span className="text-white font-mono">{user.id}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
      <img src="/logo.svg" alt="Slate360" className="h-10 w-auto mb-8" />
      <h1 className="text-3xl font-black mb-2" style={{ color: "#1E3A8A" }}>
        Welcome, {user.user_metadata?.full_name ?? user.email}
      </h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        Your dashboard is being built. You're authenticated and your session is live.
      </p>
      <div className="flex gap-4">
        <Link href="/" className="px-6 py-3 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-white transition-colors">
          Back to home
        </Link>
        <Link href="/features" className="px-6 py-3 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-all" style={{ backgroundColor: "#FF4D00" }}>
          Explore features
        </Link>
      </div>
    </div>
  );
}

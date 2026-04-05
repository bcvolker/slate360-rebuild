import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/apps");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
      <div className="mx-auto max-w-md text-center space-y-6 px-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Slate360 Ecosystem
        </h1>
        <p className="text-zinc-400 text-lg">Sales Page Under Construction</p>
        <Button asChild size="lg" className="mt-4">
          <Link href="/login">Login</Link>
        </Button>
      </div>
    </div>
  );
}

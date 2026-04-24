import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectScope } from "@/lib/projects/access";
import { SessionBoardClient } from "@/components/site-walk/SessionBoardClient";

export default async function BoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/site-walk/board");

  const { orgId } = await resolveProjectScope(user.id);
  if (!orgId) redirect("/dashboard");

  return <SessionBoardClient />;
}

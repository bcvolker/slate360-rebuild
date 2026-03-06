import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = {
  title: "Athlete360 — Slate360",
};

export default async function Athlete360Page() {
  const { user, canAccessAthlete360 } = await resolveServerOrgContext();
  if (!user) redirect("/login");

  if (!canAccessAthlete360) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#ECEEF2]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-8">
          <h1 className="text-2xl font-black text-gray-900">Athlete360</h1>
          <p className="mt-2 text-sm text-gray-600">
            Athlete360 is enabled for this account. The full module surface is available from this route.
          </p>
        </div>
      </div>
    </div>
  );
}

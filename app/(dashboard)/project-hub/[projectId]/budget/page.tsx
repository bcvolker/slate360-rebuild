import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type BudgetRow = {
  id: string;
  cost_code: string;
  description: string | null;
  budget_amount: number | string | null;
  committed_amount: number | string | null;
};

function toNumber(value: number | string | null): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function toMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/project-hub/${projectId}/budget`)}`);
  }

  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).single();
  if (!project) {
    notFound();
  }

  const { data: rows } = await supabase
    .from("project_budgets")
    .select("id, cost_code, description, budget_amount, committed_amount")
    .eq("project_id", projectId)
    .order("cost_code", { ascending: true });

  const budgetRows = (rows ?? []) as BudgetRow[];

  async function seedBudgetLine() {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/login?redirectTo=${encodeURIComponent(`/project-hub/${projectId}/budget`)}`);
    }

    const nextCode = `01-${String(budgetRows.length + 1).padStart(2, "0")}`;

    await supabase.from("project_budgets").insert({
      project_id: projectId,
      cost_code: nextCode,
      description: "Demo budget line item",
      budget_amount: 10000,
      committed_amount: 2500,
    });

    revalidatePath(`/project-hub/${projectId}/budget`);
  }

  return (
    <section className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Budget</p>
        <h2 className="text-lg font-black text-gray-900">Project Budget</h2>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Cost Code</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Committed</th>
              <th className="px-4 py-3">Variance</th>
            </tr>
          </thead>
          <tbody>
            {budgetRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                  <p>No budget lines yet.</p>
                  <form action={seedBudgetLine} className="mt-3">
                    <button
                      type="submit"
                      className="rounded-md bg-[#FF4D00] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#E64500]"
                    >
                      Add Demo Budget Line
                    </button>
                  </form>
                </td>
              </tr>
            ) : (
              budgetRows.map((row) => {
                const budget = toNumber(row.budget_amount);
                const committed = toNumber(row.committed_amount);
                const variance = budget - committed;

                return (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-800">{row.cost_code}</td>
                    <td className="px-4 py-3 text-gray-700">{row.description ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{toMoney(budget)}</td>
                    <td className="px-4 py-3 text-gray-700">{toMoney(committed)}</td>
                    <td className={`px-4 py-3 font-semibold ${variance < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {toMoney(variance)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, serverError } from "@/lib/server/api-response";
import { listScopedProjectsForUser } from "@/lib/projects/access";

type ProjectStatus = "active" | "completed" | "on-hold";

type ProjectSummaryResponse = {
  totals: {
    projects: number;
    activeProjects: number;
    completedProjects: number;
    onHoldProjects: number;
  };
  budget: {
    totalBudget: number;
    totalSpent: number;
    totalChangeOrders: number;
  };
  work: {
    openRfis: number;
    pendingSubmittals: number;
  };
  recentProjects: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
  }>;
};

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ user, admin }) => {
    const { projects, error } = await listScopedProjectsForUser(user.id);
    if (error) return serverError(error.message);

    const projectIds = projects.map((project) => project.id);
    if (projectIds.length === 0) {
      const empty: ProjectSummaryResponse = {
        totals: { projects: 0, activeProjects: 0, completedProjects: 0, onHoldProjects: 0 },
        budget: { totalBudget: 0, totalSpent: 0, totalChangeOrders: 0 },
        work: { openRfis: 0, pendingSubmittals: 0 },
        recentProjects: [],
      };
      return ok(empty);
    }

    const [rfisRes, submittalsRes, budgetsRes] = await Promise.all([
      admin.from("project_rfis").select("status, project_id").in("project_id", projectIds),
      admin.from("project_submittals").select("status, project_id").in("project_id", projectIds),
      admin
        .from("project_budgets")
        .select("budget_amount, spent_amount, change_order_amount, project_id")
        .in("project_id", projectIds),
    ]);

    if (rfisRes.error) return serverError(rfisRes.error.message);
    if (submittalsRes.error) return serverError(submittalsRes.error.message);
    if (budgetsRes.error) return serverError(budgetsRes.error.message);

    const activeProjects = projects.filter((project) => String(project.status ?? "").toLowerCase() === "active").length;
    const completedProjects = projects.filter((project) => String(project.status ?? "").toLowerCase() === "completed").length;
    const onHoldProjects = projects.filter((project) => String(project.status ?? "").toLowerCase() === "on-hold").length;

    const openRfis = (rfisRes.data ?? []).filter((row) => String(row.status ?? "").toLowerCase() === "open").length;
    const pendingSubmittals = (submittalsRes.data ?? []).filter((row) => {
      const status = String(row.status ?? "").toLowerCase();
      return status === "pending" || status === "submitted";
    }).length;

    const budgetTotals = (budgetsRes.data ?? []).reduce(
      (acc, row) => ({
        totalBudget: acc.totalBudget + Number(row.budget_amount ?? 0),
        totalSpent: acc.totalSpent + Number(row.spent_amount ?? 0),
        totalChangeOrders: acc.totalChangeOrders + Number(row.change_order_amount ?? 0),
      }),
      { totalBudget: 0, totalSpent: 0, totalChangeOrders: 0 }
    );

    const recentProjects = [...projects]
      .sort((a, b) => new Date(String(b.created_at ?? 0)).getTime() - new Date(String(a.created_at ?? 0)).getTime())
      .slice(0, 4)
      .map((project) => ({
        id: project.id,
        name: project.name,
        status: String(project.status ?? "active") as ProjectStatus,
        createdAt: String(project.created_at ?? ""),
      }));

    const payload: ProjectSummaryResponse = {
      totals: {
        projects: projects.length,
        activeProjects,
        completedProjects,
        onHoldProjects,
      },
      budget: budgetTotals,
      work: {
        openRfis,
        pendingSubmittals,
      },
      recentProjects,
    };

    return ok(payload);
  });

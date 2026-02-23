import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getScopedProjectForUser } from "@/lib/projects/access";

type TaskRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
};

function formatDate(value: string | null): string {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString();
}

function statusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (normalized === "in_progress") return "bg-blue-50 text-blue-700 border-blue-200";
  if (normalized === "blocked") return "bg-red-50 text-red-700 border-red-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
}

export default async function SchedulePage({
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
    redirect(`/login?redirectTo=${encodeURIComponent(`/project-hub/${projectId}/schedule`)}`);
  }

  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) {
    notFound();
  }

  const { data: tasks } = await supabase
    .from("project_tasks")
    .select("id, name, start_date, end_date, status")
    .eq("project_id", projectId)
    .order("start_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const rows = (tasks ?? []) as TaskRow[];

  async function seedScheduleTask() {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/login?redirectTo=${encodeURIComponent(`/project-hub/${projectId}/schedule`)}`);
    }

    const now = new Date();
    const start = now.toISOString().slice(0, 10);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 7);
    const end = endDate.toISOString().slice(0, 10);

    await supabase.from("project_tasks").insert({
      project_id: projectId,
      name: "Demo task: Site walk + initial coordination",
      start_date: start,
      end_date: end,
      status: "in_progress",
    });

    revalidatePath(`/project-hub/${projectId}/schedule`);
  }

  return (
    <section className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Schedule</p>
        <h2 className="text-lg font-black text-gray-900">Project Timeline</h2>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">
          <p>No tasks scheduled yet.</p>
          <form action={seedScheduleTask} className="mt-3">
            <button
              type="submit"
              className="rounded-md bg-[#FF4D00] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#E64500]"
            >
              Add Demo Task
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((task) => (
            <article key={task.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900">{task.name}</h3>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClass(task.status)}`}>
                  {task.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                {formatDate(task.start_date)} → {formatDate(task.end_date)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

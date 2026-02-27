import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";
import { buildCanonicalS3Key, resolveNamespace } from "@/lib/slatedrop/storage";

type Params = { projectId: string };

async function authorize(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, project: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { project } = await getScopedProjectForUser(user.id, projectId, "id,name,description,metadata,created_at,status");
  if (!project) return { user: null, project: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { user, project: project as unknown as Record<string,unknown>, error: null };
}

export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const { projectId } = await params;
  const { user, project, error } = await authorize(projectId);
  if (error || !user || !project) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { reportType: string; sections: string[]; title?: string };
  const { reportType = "Project Status", sections = [], title } = body;
  const admin = createAdminClient();

  // Gather data for the report in parallel
  const [rfisRes, subsRes, tasksRes, budgetRes, logsRes, punchRes] = await Promise.allSettled([
    admin.from("project_rfis").select("id,title,status,due_date,responsible_contractor").eq("project_id", projectId).limit(100),
    admin.from("project_submittals").select("id,title,status,document_type,due_date,response_decision").eq("project_id", projectId).limit(100),
    admin.from("project_tasks").select("id,name,status,percent_complete,start_date,end_date,priority").eq("project_id", projectId).limit(100),
    admin.from("project_budgets").select("cost_code,description,category,budget_amount,spent_amount,change_order_amount").eq("project_id", projectId).limit(200),
    admin.from("project_daily_logs").select("id,log_date,weather,summary,manpower_count").eq("project_id", projectId).order("log_date",{ascending:false}).limit(10),
    admin.from("project_punch_items").select("id,title,status,priority,assignee").eq("project_id", projectId).limit(100),
  ]);

  const rfis    = rfisRes.status  === "fulfilled" ? (rfisRes.value.data  ?? []) : [];
  const subs    = subsRes.status  === "fulfilled" ? (subsRes.value.data  ?? []) : [];
  const tasks   = tasksRes.status === "fulfilled" ? (tasksRes.value.data ?? []) : [];
  const budget  = budgetRes.status=== "fulfilled" ? (budgetRes.value.data?? []) : [];
  const logs    = logsRes.status  === "fulfilled" ? (logsRes.value.data  ?? []) : [];
  const punch   = punchRes.status === "fulfilled" ? (punchRes.value.data ?? []) : [];

  const totalBudget  = budget.reduce((s,r) => s + Number(r.budget_amount ?? 0), 0);
  const totalSpent   = budget.reduce((s,r) => s + Number(r.spent_amount  ?? 0), 0);
  const totalCOs     = budget.reduce((s,r) => s + Number(r.change_order_amount ?? 0), 0);
  const openRfis     = rfis.filter((r) => r.status === "Open" || r.status === "open").length;
  const pendingSubs  = subs.filter((s) => s.status === "Pending" || s.status === "Submitted").length;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const pctComplete  = tasks.length > 0 ? Math.round(tasks.reduce((s,t) => s + (t.percent_complete??0), 0) / tasks.length) : 0;
  const openPunch    = punch.filter((p) => p.status !== "Closed" && p.status !== "Completed").length;
  const fmt = (v: number) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v);
  const projectMeta = project.metadata as Record<string,unknown> ?? {};

  // Build structured report data
  const reportData = {
    reportType,
    title: title ?? `${String(project.name)} — ${reportType} Report`,
    generatedAt: new Date().toISOString(),
    project: {
      name: String(project.name),
      status: String(project.status ?? "Active"),
      description: String(project.description ?? ""),
      address: String(projectMeta.address ?? projectMeta.location ?? ""),
      owner: String(projectMeta.owner_name ?? ""),
      architect: String(projectMeta.architect_name ?? ""),
      contractor: String(projectMeta.contractor_name ?? ""),
      contractDate: String(projectMeta.contract_date ?? ""),
      contractAmount: String(projectMeta.contract_amount ?? ""),
    },
    summary: {
      scheduleProgress: `${pctComplete}% complete (${completedTasks}/${tasks.length} tasks)`,
      budgetStatus: `${fmt(totalSpent)} spent of ${fmt(totalBudget + totalCOs)} revised budget`,
      openRfis,
      pendingSubmittals: pendingSubs,
      openPunchItems: openPunch,
      changeOrders: fmt(totalCOs),
      variance: fmt((totalBudget + totalCOs) - totalSpent),
    },
    sections: {
      ...(sections.includes("schedule") && {
        schedule: tasks.map((t) => ({
          name: t.name, status: t.status, pct: t.percent_complete,
          start: t.start_date, end: t.end_date, priority: t.priority,
        })),
      }),
      ...(sections.includes("budget") && {
        budget: budget.map((r) => ({
          code: r.cost_code, description: r.description, category: r.category,
          budgeted: fmt(Number(r.budget_amount??0)), spent: fmt(Number(r.spent_amount??0)),
          cos: fmt(Number(r.change_order_amount??0)),
        })),
        budgetTotals: { total: fmt(totalBudget), revised: fmt(totalBudget+totalCOs), spent: fmt(totalSpent), variance: fmt((totalBudget+totalCOs)-totalSpent) },
      }),
      ...(sections.includes("rfis") && {
        rfis: rfis.map((r) => ({ title: r.title, status: r.status, due: r.due_date, contractor: r.responsible_contractor })),
      }),
      ...(sections.includes("submittals") && {
        submittals: subs.map((s) => ({ title: s.title, type: s.document_type, status: s.status, decision: s.response_decision, due: s.due_date })),
      }),
      ...(sections.includes("daily-logs") && {
        dailyLogs: logs.map((l) => ({ date: l.log_date, weather: l.weather, summary: l.summary, manpower: l.manpower_count })),
      }),
      ...(sections.includes("punch-list") && {
        punchList: punch.map((p) => ({ title: p.title, status: p.status, priority: p.priority, assignedTo: p.assignee })),
      }),
    },
  };

  let orgId: string | null = null;
  try {
    const { data } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();
    orgId = data?.org_id ?? null;
  } catch {
    orgId = null;
  }

  // Save JSON report to S3
  const safeTitle = reportType.replace(/[^a-zA-Z0-9]/g,"_");
  const reportFileName = `${Date.now()}_${safeTitle}.json`;
  const namespace = resolveNamespace(orgId, user.id);

  const { data: reportFolder } = await admin
    .from("project_folders")
    .select("id")
    .eq("project_id", projectId)
    .eq("name", "Reports")
    .limit(1)
    .maybeSingle();

  const s3Key = reportFolder?.id
    ? buildCanonicalS3Key(namespace, reportFolder.id, reportFileName)
    : `projects/${projectId}/reports/${reportFileName}`;

  const body64 = JSON.stringify(reportData, null, 2);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: s3Key,
    Body: Buffer.from(body64),
    ContentType: "application/json",
    Metadata: { "project-id": projectId, "report-type": reportType, "generated-by": user.id },
  }));

  const { data: uploadRow, error: uploadErr } = await admin
    .from("slatedrop_uploads")
    .insert({
      file_name: reportFileName,
      file_size: Buffer.byteLength(body64),
      file_type: "json",
      s3_key: s3Key,
      folder_id: reportFolder?.id ?? null,
      org_id: orgId,
      uploaded_by: user.id,
      status: "active",
    })
    .select("id")
    .single();

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const fileUrl = `/api/slatedrop/download?fileId=${encodeURIComponent(uploadRow.id)}`;

  // Save to database
  const { data: saved } = await admin.from("project_contracts").insert({
    project_id: projectId,
    title: reportData.title,
    contract_type: `Report: ${reportType}`,
    status: "Final",
    file_url: fileUrl,
    file_upload_id: uploadRow.id,
    notes: `Auto-generated ${reportType} report. Sections: ${sections.join(", ")}`,
  }).select().single();

  return NextResponse.json({ ok: true, report: reportData, saved, fileUrl, fileUploadId: uploadRow.id });
}

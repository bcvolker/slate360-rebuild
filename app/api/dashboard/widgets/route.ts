import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ProjectType = "3d" | "360" | "geo" | "plan";

type ProjectItem = {
  id: string;
  name: string;
  location: string;
  thumbnail: string;
  status: "active" | "completed" | "on-hold";
  lastEdited: string;
  type: ProjectType;
};

type JobItem = {
  id: string;
  name: string;
  type: string;
  progress: number;
  status: "completed" | "processing" | "queued" | "failed";
};

type FinancialPoint = {
  month: string;
  credits: number;
};

type ContinueItem = {
  title: string;
  subtitle: string;
  time: string;
  kind: "design" | "tour" | "rfi" | "report" | "file";
  href: string;
};

type SeatItem = {
  name: string;
  role: string;
  email: string;
  active: boolean;
};

function humanizeTime(input?: string | null) {
  if (!input) return "just now";
  const ms = Date.now() - new Date(input).getTime();
  const mins = Math.max(1, Math.floor(ms / (1000 * 60)));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function toProjectType(raw: string | null | undefined): ProjectType {
  const value = String(raw ?? "").toLowerCase();
  if (value.includes("360") || value.includes("tour")) return "360";
  if (value.includes("geo") || value.includes("map")) return "geo";
  if (value.includes("3d") || value.includes("model")) return "3d";
  return "plan";
}

function toProjectStatus(raw: string | null | undefined): "active" | "completed" | "on-hold" {
  const value = String(raw ?? "active").toLowerCase();
  if (value.includes("complete") || value.includes("closed")) return "completed";
  if (value.includes("hold") || value.includes("paused")) return "on-hold";
  return "active";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const projects: ProjectItem[] = [];
    try {
      let query = admin
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (orgId) {
        query = query.eq("org_id", orgId);
      } else {
        query = query.eq("created_by", user.id);
      }

      const { data } = await query;
      (data ?? []).forEach((row: Record<string, unknown>) => {
        const name = String(row.name ?? row.project_name ?? "Untitled Project");
        projects.push({
          id: String(row.id ?? crypto.randomUUID()),
          name,
          location: String(row.location ?? row.city ?? row.region ?? ""),
          thumbnail: String(row.thumbnail_url ?? row.cover_image ?? ""),
          status: toProjectStatus(String(row.status ?? "active")),
          lastEdited: humanizeTime(String(row.updated_at ?? row.created_at ?? "")),
          type: toProjectType(String(row.type ?? row.project_type ?? "plan")),
        });
      });
    } catch {
      // optional table; return empty
    }

    const jobs: JobItem[] = [];
    try {
      let jobQuery = admin
        .from("slatedrop_uploads")
        .select("id,file_name,file_type,status,created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (orgId) {
        jobQuery = jobQuery.eq("org_id", orgId);
      } else {
        jobQuery = jobQuery.eq("uploaded_by", user.id);
      }

      const { data } = await jobQuery;
      (data ?? []).slice(0, 6).forEach((row: Record<string, unknown>) => {
        const statusRaw = String(row.status ?? "active").toLowerCase();
        const status: JobItem["status"] =
          statusRaw === "failed"
            ? "failed"
            : statusRaw === "processing"
              ? "processing"
              : statusRaw === "pending"
                ? "queued"
                : "completed";
        jobs.push({
          id: String(row.id ?? crypto.randomUUID()),
          name: String(row.file_name ?? "File processing"),
          type: String(row.file_type ?? "Upload"),
          progress: status === "processing" ? 55 : status === "queued" ? 0 : status === "failed" ? 0 : 100,
          status,
        });
      });
    } catch {
      // optional
    }

    const financial: FinancialPoint[] = [];
    try {
      const { data } = await admin
        .from("market_trades")
        .select("created_at,total")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(600);

      const now = new Date();
      const monthBuckets = new Map<string, number>();
      for (let i = 5; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthBuckets.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
      }

      (data ?? []).forEach((row: Record<string, unknown>) => {
        const date = new Date(String(row.created_at ?? ""));
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (monthBuckets.has(key)) {
          monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + Number(row.total ?? 0));
        }
      });

      Array.from(monthBuckets.entries()).forEach(([key, value]) => {
        const [year, month] = key.split("-").map(Number);
        const d = new Date(year, month, 1);
        financial.push({
          month: d.toLocaleDateString("en-US", { month: "short" }),
          credits: Math.round(value),
        });
      });
    } catch {
      // optional
    }

    const continueWorking: ContinueItem[] = [];
    try {
      let filesQuery = admin
        .from("slatedrop_uploads")
        .select("file_name,file_type,created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(6);

      if (orgId) {
        filesQuery = filesQuery.eq("org_id", orgId);
      } else {
        filesQuery = filesQuery.eq("uploaded_by", user.id);
      }

      const { data } = await filesQuery;
      (data ?? []).forEach((row: Record<string, unknown>) => {
        continueWorking.push({
          title: String(row.file_name ?? "Untitled file"),
          subtitle: `Recent ${String(row.file_type ?? "file").toUpperCase()} upload`,
          time: humanizeTime(String(row.created_at ?? "")),
          kind: "file",
          href: "/dashboard",
        });
      });
    } catch {
      // optional
    }

    const seats: SeatItem[] = [];
    try {
      if (orgId) {
        const { data } = await admin
          .from("organization_members")
          .select("user_id,role,created_at")
          .eq("org_id", orgId)
          .limit(25);

        (data ?? []).forEach((row: Record<string, unknown>, index: number) => {
          const uid = String(row.user_id ?? "");
          seats.push({
            name: uid === user.id ? "You" : `Member ${index + 1}`,
            role: String(row.role ?? "Member"),
            email: uid === user.id ? (user.email ?? "") : `${uid.slice(0, 8)}@member.local`,
            active: true,
          });
        });
      }
    } catch {
      // optional
    }

    return NextResponse.json({
      projects,
      jobs,
      financial,
      continueWorking,
      seats,
    });
  } catch (error) {
    console.error("[dashboard/widgets]", error);
    return NextResponse.json({ error: "Failed to load dashboard widget data" }, { status: 500 });
  }
}

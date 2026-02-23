"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import { Lock, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import CreateProjectWizard, { type CreateProjectPayload } from "@/components/project-hub/CreateProjectWizard";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
};

function getTierFromOrganizationValue(value: unknown): Tier {
  const candidate =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as { tier?: string }).tier
      : Array.isArray(value) && value[0] && typeof value[0] === "object"
        ? (value[0] as { tier?: string }).tier
        : undefined;

  if (candidate === "trial" || candidate === "creator" || candidate === "model" || candidate === "business" || candidate === "enterprise") {
    return candidate;
  }

  return "trial";
}

export default function ProjectHubPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [tier, setTier] = useState<Tier>("trial");

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const ent = useMemo(() => getEntitlements(tier), [tier]);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load projects");
      }
      setProjects(Array.isArray(payload?.projects) ? payload.projects : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load projects");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "/login?redirectTo=%2Fproject-hub";
          return;
        }

        if (cancelled) return;
        setIsAuthed(true);

        try {
          const { data } = await supabase
            .from("organization_members")
            .select("organizations(tier)")
            .eq("user_id", user.id)
            .single();

          if (!cancelled) {
            setTier(getTierFromOrganizationValue(data?.organizations));
          }
        } catch {
          if (!cancelled) setTier("trial");
        }

        await loadProjects();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadProjects, supabase]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const onCreate = async (payload: CreateProjectPayload) => {
    setError(null);

    setCreating(true);
    try {
      const response = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error ?? "Failed to create project");
      }

      setModalOpen(false);
      setToast("Project created successfully.");
      await loadProjects();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center text-gray-500">
        <Loader2 size={18} className="animate-spin mr-2" /> Loading Project Hub…
      </div>
    );
  }

  if (!isAuthed) return null;

  if (!ent.canAccessHub) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] p-6 md:p-10 flex items-center justify-center">
        <div className="max-w-xl w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-[#1E3A8A]/10 text-[#1E3A8A] flex items-center justify-center">
            <Lock size={20} />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Upgrade Required</h1>
          <p className="mt-2 text-sm text-gray-500">
            Project Hub is not available on your current plan. Upgrade to Business or Enterprise to access it.
          </p>
          <a
            href="/plans?plan=business&billing=monthly"
            className="mt-5 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: "#FF4D00" }}
          >
            View Plans
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900">Project Hub</h1>
            <p className="text-sm text-gray-500 mt-1">Manage projects and keep all files organized through SlateDrop subfolders.</p>
          </div>
          <button
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: "#FF4D00" }}
          >
            <Plus size={14} /> New Project
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          {projectsLoading ? (
            <div className="py-10 text-center text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin inline mr-2" /> Loading projects…
            </div>
          ) : projects.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              No projects yet. Create your first project to provision the 15 system folders.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Link key={project.id} href={`/project-hub/${project.id}`}>
                  <article className="rounded-xl border border-gray-200 p-4 bg-gray-50/60 hover:border-[#FF4D00]/30 hover:bg-[#FF4D00]/5 transition">
                    <h2 className="font-bold text-gray-900 text-sm truncate">{project.name}</h2>
                    <p className="text-xs text-gray-500 mt-1 min-h-[32px]">{project.description || "No description"}</p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                      <span className="inline-flex rounded-full border border-gray-200 px-2 py-0.5 uppercase tracking-wide">{project.status}</span>
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateProjectWizard
        open={modalOpen}
        creating={creating}
        error={error}
        onClose={() => setModalOpen(false)}
        onSubmit={onCreate}
      />

      {toast && (
        <div className="fixed bottom-5 right-5 z-[70] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

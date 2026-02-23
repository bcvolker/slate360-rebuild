"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import { Lock, Loader2, Plus, X } from "lucide-react";

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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();

    setError(null);
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to create project");
      }

      setName("");
      setDescription("");
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
                <article key={project.id} className="rounded-xl border border-gray-200 p-4 bg-gray-50/60">
                  <h2 className="font-bold text-gray-900 text-sm truncate">{project.name}</h2>
                  <p className="text-xs text-gray-500 mt-1 min-h-[32px]">{project.description || "No description"}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="inline-flex rounded-full border border-gray-200 px-2 py-0.5 uppercase tracking-wide">{project.status}</span>
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" />
          <form
            onSubmit={onCreate}
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Create New Project</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Project Name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Maple Heights Residence"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#FF4D00" }}
              >
                {creating ? <Loader2 size={13} className="animate-spin" /> : null}
                {creating ? "Creating…" : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[70] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

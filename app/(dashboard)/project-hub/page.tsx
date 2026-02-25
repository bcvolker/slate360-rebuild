"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import { ChevronLeft, Edit3, Lock, Loader2, Plus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import Link from "next/link";
import CreateProjectWizard, { type CreateProjectPayload } from "@/components/project-hub/CreateProjectWizard";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
  created_at: string;
};

type EditProjectForm = {
  name: string;
  description: string;
  projectType: string;
  contractType: string;
  scope: string;
  address: string;
  lat: string;
  lng: string;
};

function getEditForm(project: ProjectRow): EditProjectForm {
  const metadata = project.metadata ?? {};
  const location =
    metadata.location && typeof metadata.location === "object" && !Array.isArray(metadata.location)
      ? (metadata.location as Record<string, unknown>)
      : {};

  const lat = location.lat;
  const lng = location.lng;

  return {
    name: project.name,
    description: project.description ?? "",
    projectType: typeof metadata.projectType === "string" ? metadata.projectType : "ground-up",
    contractType: typeof metadata.contractType === "string" ? metadata.contractType : "lump-sum",
    scope: typeof metadata.scope === "string" ? metadata.scope : "",
    address: typeof location.address === "string" ? location.address : "",
    lat: typeof lat === "number" || typeof lat === "string" ? String(lat) : "",
    lng: typeof lng === "number" || typeof lng === "string" ? String(lng) : "",
  };
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "on-hold" | "completed">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null);
  const [editForm, setEditForm] = useState<EditProjectForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteProject, setDeleteProject] = useState<ProjectRow | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const ent = useMemo(() => getEntitlements(tier), [tier]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return projects.filter((project) => {
      if (statusFilter !== "all" && project.status !== statusFilter) return false;
      if (!query) return true;
      const name = project.name.toLowerCase();
      const description = (project.description ?? "").toLowerCase();
      return name.includes(query) || description.includes(query);
    });
  }, [projects, searchQuery, statusFilter]);

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
      setCreatedProjectId(typeof result?.project?.id === "string" ? result.project.id : null);
      setToast("Project created successfully.");
      await loadProjects();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const onEditOpen = (project: ProjectRow) => {
    setError(null);
    setEditingProject(project);
    setEditForm(getEditForm(project));
  };

  const onEditSave = async () => {
    if (!editingProject || !editForm) return;
    if (!editForm.name.trim()) {
      setError("Project name is required");
      return;
    }

    setSavingEdit(true);
    setError(null);
    try {
      const lat = editForm.lat.trim() ? Number(editForm.lat) : null;
      const lng = editForm.lng.trim() ? Number(editForm.lng) : null;

      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          metadata: {
            projectType: editForm.projectType,
            contractType: editForm.contractType,
            scope: editForm.scope.trim(),
            location: {
              address: editForm.address.trim(),
              lat: Number.isFinite(lat) ? lat : null,
              lng: Number.isFinite(lng) ? lng : null,
            },
          },
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to update project");
      }

      setEditingProject(null);
      setEditForm(null);
      setToast("Project updated successfully.");
      await loadProjects();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update project");
    } finally {
      setSavingEdit(false);
    }
  };

  const onDelete = async () => {
    if (!deleteProject) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${deleteProject.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmText: deleteConfirmText,
          confirmName: deleteConfirmName,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to delete project");
      }

      setDeleteProject(null);
      setDeleteConfirmText("");
      setDeleteConfirmName("");
      setToast("Project deleted.");
      await loadProjects();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete project");
    } finally {
      setDeleting(false);
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
        <div className="mb-4 px-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#FF4D00] transition group font-medium"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </Link>
        </div>

        <div className="mb-6 flex flex-col justify-between gap-3 px-1 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              📋 Project Hub
              <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                {filteredProjects.length} Projects
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Premium command center for project lifecycle, sandbox records, and closeout exports.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-xl">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search projects by name or description"
                  className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
                />
              </div>
              <div className="relative w-[170px]">
                <SlidersHorizontal size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="on-hold">On hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                setError(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: "#FF4D00" }}
            >
              <Plus size={14} /> New Project
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          {projectsLoading ? (
            <div className="py-10 text-center text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin inline mr-2" /> Loading projects…
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              No projects match your search/filter. Create a new project to provision the canonical folder structure.
            </div>
          ) : (
            <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4">
              {filteredProjects.map((project) => {
                const metadata = project.metadata ?? {};
                const teamMembers = Array.isArray((metadata as { teamEmails?: unknown }).teamEmails)
                  ? ((metadata as { teamEmails: unknown[] }).teamEmails.length)
                  : Array.isArray((metadata as { teamMemberIds?: unknown }).teamMemberIds)
                    ? ((metadata as { teamMemberIds: unknown[] }).teamMemberIds.length)
                    : 0;
                const phasesRaw = typeof (metadata as { customPhases?: unknown }).customPhases === "string"
                  ? String((metadata as { customPhases?: unknown }).customPhases)
                  : "";
                const phaseCount = phasesRaw
                  .split(/[\n,]/)
                  .map((item) => item.trim())
                  .filter(Boolean).length;
                const budgetRaw = (metadata as { estimatedBudget?: unknown }).estimatedBudget;
                const budgetLabel = typeof budgetRaw === "string" && budgetRaw.trim()
                  ? budgetRaw.trim()
                  : "Not set";

                return (
                  <article
                    key={project.id}
                    className="group min-w-[320px] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="relative h-36 bg-gradient-to-br from-[#1E3A8A]/90 via-[#1E3A8A]/75 to-[#FF4D00]/80">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.20),transparent_50%)]" />
                      <div className="absolute right-3 top-3 flex items-center gap-1">
                        <button
                          onClick={() => onEditOpen(project)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/30 bg-black/25 text-white hover:bg-black/40"
                          title="Edit project"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteProject(project);
                            setDeleteConfirmText("");
                            setDeleteConfirmName("");
                            setError(null);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/30 bg-black/25 text-white hover:bg-red-600"
                          title="Delete project"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="absolute left-3 bottom-3 right-3">
                        <p className="inline-flex rounded-full border border-white/30 bg-black/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          {project.status}
                        </p>
                        <h2 className="mt-2 truncate text-sm font-bold text-white">{project.name}</h2>
                      </div>
                    </div>

                    <Link href={`/project-hub/${project.id}`} className="block p-4">
                      <p className="min-h-[34px] text-xs text-gray-500">{project.description || "No description"}</p>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                          <p className="text-[10px] uppercase tracking-wide text-gray-400">Team</p>
                          <p className="mt-0.5 font-semibold text-gray-800">{teamMembers}</p>
                        </div>
                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                          <p className="text-[10px] uppercase tracking-wide text-gray-400">Phases</p>
                          <p className="mt-0.5 font-semibold text-gray-800">{phaseCount || "—"}</p>
                        </div>
                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                          <p className="text-[10px] uppercase tracking-wide text-gray-400">Budget</p>
                          <p className="mt-0.5 truncate font-semibold text-gray-800">{budgetLabel}</p>
                        </div>
                      </div>

                      <p className="mt-3 text-[11px] text-gray-400">Created {new Date(project.created_at).toLocaleDateString()}</p>
                    </Link>
                  </article>
                );
              })}
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

      {editingProject && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditingProject(null)}>
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" />
          <div onClick={(event) => event.stopPropagation()} className="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Edit Project</h3>
              <button
                onClick={() => setEditingProject(null)}
                className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Project Name</label>
                <input
                  value={editForm.name}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Description</label>
                <input
                  value={editForm.description}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, description: event.target.value } : prev))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Project Type</label>
                <input
                  value={editForm.projectType}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, projectType: event.target.value } : prev))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Contract Type</label>
                <input
                  value={editForm.contractType}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, contractType: event.target.value } : prev))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-600">Scope</label>
                <textarea
                  rows={3}
                  value={editForm.scope}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, scope: event.target.value } : prev))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-600">Address</label>
                <input
                  value={editForm.address}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, address: event.target.value } : prev))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Latitude</label>
                <input
                  value={editForm.lat}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, lat: event.target.value } : prev))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Longitude</label>
                <input
                  value={editForm.lng}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, lng: event.target.value } : prev))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingProject(null)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onEditSave}
                disabled={savingEdit}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#FF4D00" }}
              >
                {savingEdit ? <Loader2 size={13} className="animate-spin" /> : null}
                {savingEdit ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteProject(null)}>
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" />
          <div onClick={(event) => event.stopPropagation()} className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-gray-900">Delete Project</h3>
            <p className="mt-2 text-sm text-gray-600">
              This is permanent. Type <span className="font-semibold">DELETE</span> and confirm project name to continue.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Confirm text</label>
                <input
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Project name</label>
                <input
                  value={deleteConfirmName}
                  onChange={(event) => setDeleteConfirmName(event.target.value)}
                  placeholder={deleteProject.name}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteProject(null)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : null}
                {deleting ? "Deleting…" : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[70] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg">
          <div className="flex items-center gap-3">
            <span>{toast}</span>
            {createdProjectId && (
              <Link
                href={`/project-hub/${createdProjectId}`}
                className="inline-flex items-center rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                Open Project Now
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

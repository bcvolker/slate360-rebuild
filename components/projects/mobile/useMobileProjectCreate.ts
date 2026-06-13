"use client";

import { useCallback, useState } from "react";
import {
  emptyProjectCreateForm,
  type ProjectCreateFormState,
} from "./project-create-constants";

type CreateProjectResponse = {
  ok?: boolean;
  project?: { id: string };
  error?: string;
};

type InviteResponse = {
  error?: string;
};

export function useMobileProjectCreate() {
  const [form, setForm] = useState<ProjectCreateFormState>(emptyProjectCreateForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [inviteWarnings, setInviteWarnings] = useState<string[]>([]);

  const updateForm = useCallback(
    <K extends keyof ProjectCreateFormState>(key: K, value: ProjectCreateFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const addInvite = useCallback((email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) return false;
    setForm((prev) => {
      if (prev.invites.includes(normalized)) return prev;
      return { ...prev, invites: [...prev.invites, normalized] };
    });
    return true;
  }, []);

  const removeInvite = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      invites: prev.invites.filter((_, idx) => idx !== index),
    }));
  }, []);

  const createProject = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    setInviteWarnings([]);

    try {
      const res = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          metadata: {
            location: {
              address: form.address.trim(),
              lat: null,
              lng: null,
              boundary: [],
            },
          },
        }),
      });

      const data = (await res.json().catch(() => ({}))) as CreateProjectResponse;
      if (!res.ok || !data.project?.id) {
        throw new Error(data.error ?? "Failed to create project");
      }

      const projectId = data.project.id;
      const failedInvites: string[] = [];

      for (const email of form.invites) {
        const inviteRes = await fetch(`/api/projects/${projectId}/collaborators/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            channel: "email",
            role: "collaborator",
          }),
        });

        if (!inviteRes.ok) {
          const inviteData = (await inviteRes.json().catch(() => ({}))) as InviteResponse;
          failedInvites.push(inviteData.error ? `${email}: ${inviteData.error}` : email);
        }
      }

      setCreatedProjectId(projectId);
      if (failedInvites.length > 0) {
        setInviteWarnings(failedInvites);
      }
      return projectId;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [form]);

  const reset = useCallback(() => {
    setForm(emptyProjectCreateForm());
    setError(null);
    setInviteWarnings([]);
    setCreatedProjectId(null);
    setIsSubmitting(false);
  }, []);

  return {
    form,
    updateForm,
    addInvite,
    removeInvite,
    createProject,
    isSubmitting,
    error,
    inviteWarnings,
    createdProjectId,
    reset,
  };
}

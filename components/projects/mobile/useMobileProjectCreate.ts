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

export function useMobileProjectCreate() {
  const [form, setForm] = useState<ProjectCreateFormState>(emptyProjectCreateForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  const updateForm = useCallback(
    <K extends keyof ProjectCreateFormState>(key: K, value: ProjectCreateFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const createProject = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.scope.trim(),
          metadata: {
            project_type: form.projectType || null,
            client: form.client.trim() || null,
            start_date: form.startDate || null,
            target_date: form.targetDate || null,
            square_footage: form.squareFootage.trim() || null,
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

      setCreatedProjectId(data.project.id);
      return data.project.id;
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
    setCreatedProjectId(null);
    setIsSubmitting(false);
  }, []);

  return {
    form,
    updateForm,
    createProject,
    isSubmitting,
    error,
    createdProjectId,
    reset,
  };
}

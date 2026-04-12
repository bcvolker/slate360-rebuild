"use client";

import { useState } from "react";
import { ModelListClient } from "./ModelListClient";
import { ModelEditorClient } from "./ModelEditorClient";

interface Project {
  id: string;
  name: string;
}

export function DesignStudioShell({ projects }: { projects: Project[] }) {
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>(
    projects[0]?.id ?? "",
  );

  if (activeModelId) {
    return (
      <ModelEditorClient
        modelId={activeModelId}
        onBack={() => setActiveModelId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {projects.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Project:</label>
          <select
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {selectedProject ? (
        <ModelListClient
          projectId={selectedProject}
          onSelectModel={setActiveModelId}
        />
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No projects found. Create a project in the Dashboard first.
        </p>
      )}
    </div>
  );
}

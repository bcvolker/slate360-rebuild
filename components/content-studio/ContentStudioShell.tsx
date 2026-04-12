"use client";

import { useState } from "react";
import { AssetListClient } from "./AssetListClient";
import { AssetEditorClient } from "./AssetEditorClient";

interface Project {
  id: string;
  name: string;
}

export function ContentStudioShell({ projects }: { projects: Project[] }) {
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>(
    projects[0]?.id ?? "",
  );

  if (activeAssetId) {
    return (
      <AssetEditorClient
        assetId={activeAssetId}
        onBack={() => setActiveAssetId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {projects.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            Project:
          </label>
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
        <AssetListClient
          projectId={selectedProject}
          onSelectAsset={setActiveAssetId}
        />
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No projects found. Create a project in the Dashboard first.
        </p>
      )}
    </div>
  );
}

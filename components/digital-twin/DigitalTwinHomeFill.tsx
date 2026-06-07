"use client";

import {
  MobileHomeSlateDropFolderGrid,
  type HomeSlateDropFolder,
} from "@/components/studio-ui/MobileAppHomeSlateDropFolderGrid";
import { mobileTokens } from "@/components/mobile-system";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";

type DigitalTwinHomeFillProps = {
  twins: HubTwin[];
  projects: HubTwinProject[];
};

/** SlateDrop folder row for Twin 360 home — twin workspaces and project context. */
export function buildDigitalTwinSlateDropFolders(
  twins: HubTwin[],
  projects: HubTwinProject[],
): HomeSlateDropFolder[] {
  const folders: HomeSlateDropFolder[] = [];
  const seen = new Set<string>();

  const pushFolder = (folder: HomeSlateDropFolder) => {
    if (seen.has(folder.id)) return;
    seen.add(folder.id);
    folders.push(folder);
  };

  pushFolder({
    id: "twin-360-files",
    label: "Twin 360 Files",
    href: "/slatedrop/twin-360-files",
    tone: "system",
  });

  pushFolder({
    id: "general-files",
    label: "General Files",
    href: "/slatedrop/general-files",
    tone: "system",
  });

  for (const twin of twins.slice(0, 4)) {
    pushFolder({
      id: `twin-${twin.id}`,
      label: twin.title,
      href: `/digital-twin/twins/${twin.id}`,
      tone: "project",
    });
  }

  for (const project of projects.slice(0, 4)) {
    pushFolder({
      id: `project-${project.id}`,
      label: project.name,
      href: `/project-hub/${project.id}`,
      tone: "workspace",
    });
  }

  return folders;
}

export function DigitalTwinHomeFill({ twins, projects }: DigitalTwinHomeFillProps) {
  const folders = buildDigitalTwinSlateDropFolders(twins, projects);

  return (
    <MobileHomeSlateDropFolderGrid
      folders={folders}
      openHref="/slatedrop"
      newFolderHref="/slatedrop/new-folder"
      folderIconClassName={mobileTokens.appHomeSlateDropTileIconBlue}
      newFolderIconClassName={mobileTokens.appHomeSlateDropTileIconNewBlue}
      labelAccentClassName={mobileTokens.twin360HomeSectionLabelAccent}
    />
  );
}

/** Rows for expandable dock tabs on Twin 360 home. */
export function buildDigitalTwinDockRows(twins: HubTwin[], projects: HubTwinProject[]) {
  return {
    twins: twins.slice(0, 8).map((twin) => ({
      key: twin.id,
      title: twin.title,
      meta: twin.status.replace(/_/g, " "),
      metaTone: "info" as const,
      href: `/digital-twin/twins/${twin.id}`,
    })),
    projects: projects.slice(0, 8).map((project) => ({
      key: project.id,
      title: project.name,
      meta: project.status,
      metaTone: "neutral" as const,
      href: `/project-hub/${project.id}`,
    })),
  };
}

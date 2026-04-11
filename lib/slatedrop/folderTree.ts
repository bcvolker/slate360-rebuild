import type { Tier } from "@/lib/entitlements";
import { getEntitlements } from "@/lib/entitlements";

export type SlateDropFolderNode = {
  id: string;
  name: string;
  isSystem: boolean;
  icon?: string;
  children: SlateDropFolderNode[];
  parentId: string | null;
};

export type SlateDropRootFolderSummary = {
  id: string;
  name: string;
  icon?: string;
};

function node(id: string, name: string, opts?: { icon?: string; isSystem?: boolean }): SlateDropFolderNode {
  return {
    id,
    name,
    icon: opts?.icon,
    isSystem: opts?.isSystem ?? true,
    children: [],
    parentId: null,
  };
}

/**
 * Returns the top-level SlateDrop folder tree.
 *
 * Important: This is the canonical tier-gated folder list used for:
 * - Standalone SlateDrop sidebar
 * - Dashboard SlateDrop widget compact folder icon view
 */
export function buildSlateDropBaseFolderTree(tier: Tier): SlateDropFolderNode[] {
  const ent = getEntitlements(tier);

  const folders: SlateDropFolderNode[] = [
    node("general", "General", { icon: "📁", isSystem: true }),
    node("history", "History", { icon: "🕒", isSystem: true }),
  ];

  // App-specific folders (visible when user has access to that app)
  // Site Walk is always visible (core app, available to all tiers)
  folders.push(node("site-walk", "Site Walk", { icon: "🚶", isSystem: true }));

  if (ent.canAccessTourBuilder) {
    folders.push(node("360-tour-builder", "360 Tour Builder", { icon: "🔭", isSystem: true }));
  }
  if (ent.canAccessDesignStudio) {
    folders.push(node("design-studio", "Design Studio", { icon: "🎨", isSystem: true }));
  }
  if (ent.canAccessContent) {
    folders.push(node("content-studio", "Content Studio", { icon: "📝", isSystem: true }));
  }
  if (ent.canAccessGeospatial) {
    folders.push(node("geospatial", "Geospatial & Robotics", { icon: "🛰️", isSystem: true }));
  }
  if (ent.canAccessVirtual) {
    folders.push(node("virtual-studio", "Virtual Studio", { icon: "🎬", isSystem: true }));
  }
  if (ent.canAccessAnalytics) {
    folders.push(node("analytics", "Analytics & Reports", { icon: "📊", isSystem: true }));
  }

  // Project Sandbox is a Hub-level surface.
  if (ent.canAccessHub) {
    folders.push(node("projects", "Project Sandbox", { icon: "🏗️", isSystem: true }));
  }

  return folders;
}

export function listSlateDropRootFolders(tier: Tier): SlateDropRootFolderSummary[] {
  return buildSlateDropBaseFolderTree(tier).map(({ id, name, icon }) => ({ id, name, icon }));
}

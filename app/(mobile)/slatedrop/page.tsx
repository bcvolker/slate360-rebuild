import { redirect } from "next/navigation";
import { Box, Brush } from "lucide-react";
import { SlateDropBrowserShell } from "@/components/slatedrop/SlateDropBrowserShell";
import { SLATEDROP_FOLDER_ICONS } from "@/components/mobile-system/MobileSlateDropClient";
import type { SlateDropBrowseFolder } from "@/components/slatedrop/slatedrop-browser-types";
import { shouldHideInAppStoreMode } from "@/lib/app-store-mode";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";

export const metadata = { title: "SlateDrop — Slate360" };

export default async function SlateDropPage() {
  const { user, orgId, isBetaApproved } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/slatedrop");
  if (!isBetaApproved) redirect("/beta-pending");

  const entitlements = await resolveOrgEntitlements(orgId);
  const appFolders = [
    {
      slug: "site-walk-files",
      label: "Site Walk Files",
      active: entitlements.canAccessStandalonePunchwalk || entitlements.canAccessHub,
      icon: SLATEDROP_FOLDER_ICONS.camera,
      folders: ["Walk Sessions", "Photos", "Plans", "Markups", "Voice Notes", "Deliverables"],
    },
    {
      slug: "360-tour-files",
      label: "360 Tour Files",
      active: entitlements.canAccessStandaloneTourBuilder || entitlements.canAccessTourBuilder,
      icon: SLATEDROP_FOLDER_ICONS.compass,
      folders: ["Panoramas", "Scenes", "Hotspots", "Tour Exports"],
    },
    {
      slug: "design-studio-files",
      label: "Design Studio Files",
      active: entitlements.canAccessStandaloneDesignStudio || entitlements.canAccessDesignStudio,
      icon: Box,
      folders: ["Models", "Drawings", "Review Attachments", "Exports"],
    },
    {
      slug: "content-studio-files",
      label: "Content Studio Files",
      active: entitlements.canAccessStandaloneContentStudio || entitlements.canAccessContent,
      icon: Brush,
      folders: ["Raw Media", "Edits", "Branded Exports", "Campaign Assets"],
    },
  ];

  const visibleAppFolders = appFolders.filter((folder) => !shouldHideInAppStoreMode(!folder.active));
  const browseFolders: SlateDropBrowseFolder[] = [
    {
      id: "general-files",
      name: "General Files",
      href: "/slatedrop/general-files",
      meta: "Uploads, received, shared, archive",
      icon: SLATEDROP_FOLDER_ICONS.folder,
    },
    ...visibleAppFolders
      .filter((folder) => folder.active)
      .map((folder) => ({
        id: folder.slug,
        name: folder.label,
        href: `/slatedrop/${folder.slug}`,
        meta: folder.folders.slice(0, 3).join(" · "),
        icon: folder.icon,
      })),
  ];

  return (
    <SlateDropBrowserShell folders={browseFolders} maxStorageGB={entitlements.maxStorageGB} />
  );
}

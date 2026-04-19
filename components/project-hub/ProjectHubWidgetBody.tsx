"use client";

import Link from "next/link";
import { FolderOpen, FileText } from "lucide-react";
import LocationMap from "@/components/dashboard/LocationMap";
import {
  WeatherWidgetBody,
  FinancialWidgetBody,
  CalendarWidgetBody,
  ContactsWidgetBody,
  ContinueWidgetBody,
  ProcessingWidgetBody,
  SuggestWidgetBody,
  DataUsageWidgetBody,
} from "@/components/widgets/WidgetBodies";

const FALLBACK_FOLDER_VIEW = [
  { name: "Project Sandbox", description: "Shared cross-module workspace" },
  { name: "Design Studio", description: "Models, plans, and redlines" },
  { name: "Content Studio", description: "Media, exports, and brand assets" },
  { name: "360 Tours", description: "Tour captures and annotations" },
];

type Props = {
  id: string;
  isExpanded: boolean;
  slateDropWidgetView: "recent" | "folders";
  onSlateDropWidgetViewChange: (view: "recent" | "folders") => void;
  slateDropFolders: { name: string; count: number }[];
  slateDropFiles: { name: string }[];
};

export default function ProjectHubWidgetBody({
  id,
  isExpanded,
  slateDropWidgetView,
  onSlateDropWidgetViewChange,
  slateDropFolders,
  slateDropFiles,
}: Props) {
  if (id === "slatedrop") {
    return (
      <div className="space-y-4">
        <div className="inline-flex items-center rounded-lg border border-app p-0.5">
          <button
            onClick={() => onSlateDropWidgetViewChange("recent")}
            className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${
              slateDropWidgetView === "recent"
                ? "bg-[#3B82F6] text-white"
                : "text-zinc-400 hover:bg-white/[0.04]"
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => onSlateDropWidgetViewChange("folders")}
            className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${
              slateDropWidgetView === "folders"
                ? "bg-[#3B82F6] text-white"
                : "text-zinc-400 hover:bg-white/[0.04]"
            }`}
          >
            Folder View
          </button>
        </div>

        {slateDropWidgetView === "recent" ? (
          <div className="space-y-2">
            {slateDropFiles.length > 0 ? (
              slateDropFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.04]/50 hover:bg-white/[0.04] transition-colors"
                >
                  <FileText size={13} className="text-zinc-500 shrink-0" />
                  <span className="text-[11px] text-zinc-300 truncate flex-1">{file.name}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-zinc-500">No recent files</div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {(slateDropFolders.length > 0 ? slateDropFolders : FALLBACK_FOLDER_VIEW).map((folder) => (
              <div key={folder.name} className="rounded-lg border border-app bg-white/[0.04]/50 px-3 py-2">
                <p className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
                  <FolderOpen size={12} className="text-[#3B82F6]" /> {folder.name}
                </p>
                {"description" in folder ? (
                  <p className="text-[10px] text-zinc-500 mt-1">{folder.description}</p>
                ) : (
                  <p className="text-[10px] text-zinc-500 mt-1">{folder.count} files</p>
                )}
              </div>
            ))}
          </div>
        )}

        {isExpanded && <div className="text-[10px] text-zinc-500">Pending uploads —</div>}

        <Link
          href="/slatedrop"
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#3B82F6] hover:underline"
        >
          <FolderOpen size={10} /> Open SlateDrop →
        </Link>
      </div>
    );
  }

  if (id === "location") {
    return (
      <div className={isExpanded ? "min-h-[400px] flex flex-col" : "min-h-[200px] flex flex-col"}>
        <LocationMap compact={!isExpanded} expanded={isExpanded} />
      </div>
    );
  }

  if (id === "data-usage") return <DataUsageWidgetBody />;
  if (id === "processing") return <ProcessingWidgetBody />;
  if (id === "suggest") return <SuggestWidgetBody expanded={isExpanded} />;
  if (id === "weather") return <WeatherWidgetBody tempF={72} expanded={isExpanded} />;
  if (id === "financial") return <FinancialWidgetBody expanded={isExpanded} />;
  if (id === "calendar") return <CalendarWidgetBody />;
  if (id === "contacts") return <ContactsWidgetBody />;
  if (id === "continue") return <ContinueWidgetBody />;

  return null;
}

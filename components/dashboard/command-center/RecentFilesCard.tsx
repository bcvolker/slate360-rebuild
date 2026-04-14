"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, FileImage, File, Inbox, Loader2 } from "lucide-react";
import type { RecentFile } from "@/lib/types/command-center";

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getFileIcon(type: string | null) {
  if (!type) return File;
  if (type.startsWith("image/")) return FileImage;
  if (type.includes("pdf") || type.includes("document") || type.includes("text")) return FileText;
  return File;
}

function timeAgo(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface RecentFilesCardProps {
  files: RecentFile[];
  isLoading: boolean;
}

export function RecentFilesCard({ files, isLoading }: RecentFilesCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-glass border-glass shadow-glass">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-glass border-glass shadow-glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            Recent Files
          </CardTitle>
          <a href="/slatedrop" className="text-xs text-primary hover:underline">
            View all
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {files.length > 0 ? (
          files.map((file) => {
            const Icon = getFileIcon(file.file_type);
            const href = file.project_id
              ? `/project-hub/${file.project_id}/slatedrop`
              : "/slatedrop";
            return (
              <a
                key={file.id}
                href={href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-primary/10 transition-colors group"
              >
                <div className="h-8 w-8 rounded bg-muted/50 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary truncate">{file.file_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>·</span>
                    <span>{timeAgo(file.created_at)}</span>
                  </div>
                </div>
              </a>
            );
          })
        ) : (
          <div className="text-center py-6">
            <Inbox className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No files uploaded yet</p>
            <a href="/slatedrop" className="text-sm text-primary hover:underline mt-1 inline-block">
              Upload your first file
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

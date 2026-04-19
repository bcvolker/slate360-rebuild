"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HardDrive, Loader2 } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface StorageCreditsCardProps {
  storageUsedBytes: number;
  fileCount: number;
  storageLimitGb: number;
  isLoading: boolean;
}

export function StorageCreditsCard({ storageUsedBytes, fileCount, storageLimitGb, isLoading }: StorageCreditsCardProps) {
  if (isLoading) {
    return (
      <Card className="rounded-2xl bg-glass border-glass shadow-glass">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const storageLimitBytes = storageLimitGb * 1024 * 1024 * 1024;
  const percentUsed = storageLimitBytes > 0
    ? Math.min(100, Math.round((storageUsedBytes / storageLimitBytes) * 100))
    : 0;
  const usedLabel = formatBytes(storageUsedBytes);
  const remainingBytes = Math.max(0, storageLimitBytes - storageUsedBytes);
  const remainingLabel = formatBytes(remainingBytes);

  return (
    <Card className="rounded-2xl bg-glass border-glass shadow-glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Storage
          </CardTitle>
          <Link
            href="/my-account"
            className="text-xs text-muted-foreground hover:text-teal transition-colors"
          >
            Manage
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Progress value={percentUsed} className="h-2 bg-muted/30" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{usedLabel} of {storageLimitGb} GB used ({percentUsed}%)</span>
            <span>{remainingLabel} available</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {fileCount.toLocaleString()} active files tracked across your workspace
        </p>
      </CardContent>
    </Card>
  );
}

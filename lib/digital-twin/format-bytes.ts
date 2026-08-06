export function formatTwinBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDownsampleNotice(originalCount: number, cappedCount: number): string {
  return `Showing ${cappedCount.toLocaleString()} of ${originalCount.toLocaleString()} points (capped for performance)`;
}

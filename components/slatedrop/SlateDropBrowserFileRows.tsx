import Link from "next/link";
import { getFileColor, getFileIcon } from "@/lib/slatedrop/helpers";
import type { SlateDropBrowserFile } from "./slatedrop-browser-types";
import { slatedropBrowserTokens as t } from "./slatedrop-browser-tokens";

type SlateDropBrowserFileRowProps = {
  file: SlateDropBrowserFile;
};

export function SlateDropBrowserFileRow({ file }: SlateDropBrowserFileRowProps) {
  const Icon = getFileIcon(file.type);
  const iconColor = getFileColor(file.type);

  const inner = (
    <>
      <span className={t.fileIconWell} style={{ color: iconColor }}>
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-[var(--graphite-text-header)]">
          {file.name}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--graphite-muted)]">
          {file.date} · {file.size}
        </span>
      </span>
    </>
  );

  // Deliverable LINK rows open their in-app viewer; other files stay non-interactive
  // here (the recent-files list is a glance surface — full file actions live in the
  // project explorer).
  if (file.openHref) {
    return (
      <Link href={file.openHref} className={t.fileRow}>
        {inner}
      </Link>
    );
  }

  return <div className={t.fileRow}>{inner}</div>;
}

export function SlateDropBrowserFileTableRow({ file }: SlateDropBrowserFileRowProps) {
  const Icon = getFileIcon(file.type);
  const iconColor = getFileColor(file.type);

  return (
    <tr className={t.tableRow}>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <span className={t.fileIconWell} style={{ color: iconColor }}>
            <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="truncate font-medium text-[var(--graphite-text-header)]">{file.name}</span>
        </div>
      </td>
      <td className="py-3 text-center text-[var(--graphite-muted)]">{file.date}</td>
      <td className="py-3 text-right text-[var(--graphite-muted)]">{file.size}</td>
    </tr>
  );
}

export function SlateDropBrowserEmptyFiles({ loading }: { loading: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--mobile-app-card-border)] px-4 py-8 text-center">
      <p className="text-sm font-medium text-[var(--graphite-text-header)]">
        {loading ? "Loading recent files…" : "No recent files"}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[var(--graphite-muted)]">
        {loading
          ? "Fetching your latest uploads."
          : "Upload files or open a project folder to see activity here."}
      </p>
    </div>
  );
}

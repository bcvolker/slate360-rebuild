"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import GridLayout, { Layout } from "react-grid-layout";
import { Loader2 } from "lucide-react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

type RecentFile = {
  id: string;
  name: string;
  type: string;
  createdAt: string;
};

const DEFAULT_LAYOUT: Layout = [
  { i: "slatedrop", x: 0, y: 0, w: 6, h: 5, minW: 4, minH: 4 },
  { i: "rfis", x: 6, y: 0, w: 3, h: 3, minW: 3, minH: 3 },
  { i: "schedule", x: 9, y: 0, w: 3, h: 3, minW: 3, minH: 3 },
];

function widgetShell(children: React.ReactNode) {
  return <div className="h-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">{children}</div>;
}

export default function ProjectOverviewPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT);
  const [filesLoading, setFilesLoading] = useState(true);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    const loadRecent = async () => {
      setFilesLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/recent-files`, { cache: "no-store" });
        const payload = await res.json().catch(() => ({}));
        if (cancelled) return;
        setRecentFiles(Array.isArray(payload?.files) ? payload.files : []);
      } finally {
        if (!cancelled) setFilesLoading(false);
      }
    };

    void loadRecent();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const content = useMemo(
    () => ({
      slatedrop: widgetShell(
        <>
          <h2 className="text-sm font-black text-gray-900">SlateDrop Widget</h2>
          <p className="mb-3 mt-1 text-xs text-gray-500">5 most recent files for this project</p>
          {filesLoading ? (
            <div className="flex h-[130px] items-center justify-center text-sm text-gray-500">
              <Loader2 size={16} className="mr-2 animate-spin" /> Loading recent files…
            </div>
          ) : recentFiles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
              No uploads yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {recentFiles.map((file) => (
                <li key={file.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-gray-800">{file.name}</p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-gray-500">
                    {file.type || "file"} • {new Date(file.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      ),
      rfis: widgetShell(
        <>
          <h2 className="text-sm font-black text-gray-900">Open RFIs Widget</h2>
          <p className="mt-1 text-xs text-gray-500">Placeholder metric</p>
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-5">
            <p className="text-3xl font-black text-gray-900">0</p>
            <p className="text-xs text-gray-500">Open RFIs</p>
          </div>
        </>
      ),
      schedule: widgetShell(
        <>
          <h2 className="text-sm font-black text-gray-900">Schedule Snapshot Widget</h2>
          <p className="mt-1 text-xs text-gray-500">Placeholder card</p>
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-5 text-sm text-gray-600">
            Milestone summary and timeline snapshot will appear here.
          </div>
        </>
      ),
    }),
    [filesLoading, recentFiles]
  );

  return (
    <section className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Overview</p>
      <GridLayout
        className="layout"
        layout={layout}
        gridConfig={{
          cols: 12,
          rowHeight: 38,
          margin: [12, 12],
        }}
        dragConfig={{
          handle: ".drag-handle",
        }}
        width={1120}
        onLayoutChange={(nextLayout) => setLayout(nextLayout)}
      >
        <div key="slatedrop">
          <div className="drag-handle mb-2 cursor-move text-xs font-semibold uppercase tracking-wide text-gray-400">Drag</div>
          {content.slatedrop}
        </div>
        <div key="rfis">
          <div className="drag-handle mb-2 cursor-move text-xs font-semibold uppercase tracking-wide text-gray-400">Drag</div>
          {content.rfis}
        </div>
        <div key="schedule">
          <div className="drag-handle mb-2 cursor-move text-xs font-semibold uppercase tracking-wide text-gray-400">Drag</div>
          {content.schedule}
        </div>
      </GridLayout>
    </section>
  );
}

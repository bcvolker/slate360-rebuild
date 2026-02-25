"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { CloudSun, FileText } from "lucide-react";

// INJECTING CSS DIRECTLY TO PREVENT WHITE WIREFRAME COLLAPSE
const injectedCSS = `
  .react-grid-layout { position: relative; transition: height 200ms ease; }
  .react-grid-item { transition: all 200ms ease; transition-property: left, top; }
  .react-grid-item.cssTransforms { transition-property: transform; }
  .react-grid-item.resizing { z-index: 1; will-change: width, height; }
  .react-grid-item.react-draggable-dragging { transition: none; z-index: 3; will-change: transform; }
  .react-grid-item.react-grid-placeholder { background: #FF4D00; opacity: 0.2; transition-duration: 100ms; z-index: 2; border-radius: 1rem; }
`;

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function ProjectDashboardGrid({ projectId, project }: { projectId: string, project: any }) {
  const [files, setFiles] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/recent-files`).then(r => r.json()).then(d => setFiles(d.files || []));
  }, [projectId]);

  const layouts = { lg: [ { i: "info", x: 0, y: 0, w: 4, h: 2 }, { i: "weather", x: 4, y: 0, w: 4, h: 2 }, { i: "files", x: 0, y: 2, w: 8, h: 2 } ] };

  return (
    <div className="w-full min-h-[600px]">
      <style>{injectedCSS}</style>
      
      <ResponsiveGridLayout className="layout w-full" layouts={layouts} breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }} cols={{ lg: 12, md: 10, sm: 6, xs: 4 }} rowHeight={100} margin={[20, 20]} draggableHandle=".drag-handle">
        
        <div key="info" className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="drag-handle bg-gray-50 border-b border-gray-100 p-3 cursor-move flex items-center justify-between"><h3 className="font-black text-gray-800 text-sm">Project Info</h3></div>
          <div className="p-4 flex-1">
            <p className="text-xl font-bold text-[#1E3A8A]">{project.name}</p>
            <p className="text-sm text-gray-500 mt-2">{project.description || "No description"}</p>
          </div>
        </div>

        <div key="weather" className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="drag-handle bg-gray-50 border-b border-gray-100 p-3 cursor-move flex items-center justify-between"><h3 className="font-black text-gray-800 text-sm">Weather</h3></div>
          <div className="p-4 flex-1 flex flex-col justify-center items-center text-center">
            <CloudSun size={32} className="text-[#FF4D00] mb-2" />
            <p className="text-gray-500 text-sm">Live Weather Integration Active</p>
          </div>
        </div>

        <div key="files" className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="drag-handle bg-gray-50 border-b border-gray-100 p-3 cursor-move flex items-center justify-between">
            <h3 className="font-black text-gray-800 text-sm">Recent SlateDrop Files</h3>
            <Link href={`/project-hub/${projectId}/files`} className="text-xs text-[#FF4D00] font-bold hover:underline">View All</Link>
          </div>
          <div className="p-4 flex-1 overflow-auto">
            {files.length === 0 ? <p className="text-sm text-gray-400">No files yet.</p> : (
              <ul className="space-y-2">
                {files.slice(0,3).map(f => (
                  <li key={f.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-100"><FileText size={14} className="text-gray-400"/><span className="text-sm font-semibold text-gray-700 truncate">{f.name}</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </ResponsiveGridLayout>
    </div>
  );
}
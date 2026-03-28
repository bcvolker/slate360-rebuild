"use client";

import { Download, FileText } from "lucide-react";
import { type DrawingFile, guessSet } from "./_shared";

interface Props {
  files: DrawingFile[];
  urlMap: Record<string, string>;
  pageCounts: Record<string, number>;
  onSelect: (file: DrawingFile) => void;
}

export default function DrawingsList({ files, urlMap, pageCounts, onSelect }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-800/50 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-2">Drawing Name</th>
            <th className="px-4 py-2">Set</th>
            <th className="px-4 py-2">Pages</th>
            <th className="px-4 py-2">Modified</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {files.map((file) => {
            const set = guessSet(file.name);
            const pages = pageCounts[file.id];
            return (
              <tr key={file.id} className="hover:bg-zinc-800/50 cursor-pointer" onClick={() => onSelect(file)}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="shrink-0 text-indigo-400" />
                    <span className="font-semibold text-zinc-200">{file.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5"><span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">{set}</span></td>
                <td className="px-4 py-2.5 text-zinc-400">{pages ?? "—"}</td>
                <td className="px-4 py-2.5 text-zinc-500">{file.modified ?? "—"}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={(e) => { e.stopPropagation(); if (urlMap[file.id]) { const a = document.createElement("a"); a.href = urlMap[file.id]; a.download = file.name; a.target = "_blank"; a.click(); } }} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300" title="Download"><Download size={14} /></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

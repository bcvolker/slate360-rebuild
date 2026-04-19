"use client";

import { Download, FileImage } from "lucide-react";
import { type PhotoFile, guessCategory, getExtension } from "./_shared";

interface Props {
  files: PhotoFile[];
  urlMap: Record<string, string>;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  onOpenLightbox: (index: number) => void;
}

export default function PhotosListView({
  files, urlMap, selectedIds, toggleSelect, selectAll, clearSelection, onOpenLightbox,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-800/50 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            <th className="w-8 px-3 py-2">
              <input
                type="checkbox"
                checked={selectedIds.size === files.length && files.length > 0}
                onChange={(e) => e.target.checked ? selectAll() : clearSelection()}
                className="rounded border-zinc-600"
              />
            </th>
            <th className="w-12 px-2 py-2">Thumb</th>
            <th className="px-3 py-2">File Name</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Modified</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {files.map((file, idx) => {
            const url = urlMap[file.id];
            const selected = selectedIds.has(file.id);
            return (
              <tr key={file.id} className={`hover:bg-zinc-800/50 ${selected ? "bg-[#F59E0B]/5" : ""}`}>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelect(file.id)}
                    className="rounded border-zinc-600"
                  />
                </td>
                <td className="px-2 py-2">
                  <button onClick={() => onOpenLightbox(idx)} className="block">
                    {url ? (
                      <img src={url} alt="" className="h-8 w-8 rounded object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-800 text-zinc-500">
                        <FileImage size={12} />
                      </div>
                    )}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => onOpenLightbox(idx)} className="font-semibold text-zinc-200 hover:text-[#F59E0B]">{file.name}</button>
                </td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">{guessCategory(file.name)}</span>
                </td>
                <td className="px-3 py-2 text-zinc-500">{getExtension(file)}</td>
                <td className="px-3 py-2 text-zinc-500">{file.modified ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => { if (url) { const a = document.createElement("a"); a.href = url; a.download = file.name; a.target = "_blank"; a.click(); } }}
                    className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                    title="Download"
                  >
                    <Download size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
"use client";

import { useState } from "react";
import { BarChart2, Book, CheckCircle2, Download, Loader2 } from "lucide-react";
import { REPORT_TYPES, SECTIONS_OPTIONS } from "./_shared";

interface Props {
  projectId: string;
  projectName: string;
  showToast: (msg: string) => void;
}

export default function ManagementReportsTab({ projectId, projectName, showToast }: Props) {
  const [reportType, setReportType] = useState(REPORT_TYPES[0]);
  const [reportSections, setReportSections] = useState<string[]>(["schedule", "budget", "rfis"]);
  const [reportTitle, setReportTitle] = useState("");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<{ title: string; summary: Record<string, unknown>; fileUrl: string; fileUploadId?: string } | null>(null);

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/management/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, sections: reportSections, title: reportTitle || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { report, fileUrl, fileUploadId } = await res.json();
      setReportResult({ title: report.title, summary: report.summary as Record<string, unknown>, fileUrl, fileUploadId });
      showToast("Report generated successfully");
    } catch (err) { showToast(err instanceof Error ? err.message : "Report generation failed"); }
    finally { setGeneratingReport(false); }
  };

  const openReportFile = async () => {
    if (!reportResult) return;
    try {
      if (reportResult.fileUploadId) {
        const res = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(reportResult.fileUploadId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) throw new Error(data.error ?? "Unable to open report");
        window.open(data.url as string, "_blank", "noopener,noreferrer");
        return;
      }
      window.open(reportResult.fileUrl, "_blank", "noopener,noreferrer");
    } catch (err) { showToast(err instanceof Error ? err.message : "Unable to open report"); }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* ── Left: Report Config ── */}
      <div className="xl:col-span-1 space-y-5">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 space-y-5">
          <div>
            <h3 className="text-sm font-black text-gray-900 mb-4">Generate Professional Report</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Report Type</label>
                <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F59E0B]">
                  {REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Custom Title (optional)</label>
                <input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder={`${projectName ? projectName + " — " : ""}${reportType} Report`} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F59E0B]" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-700">Include Sections</label>
                <div className="space-y-2">
                  {SECTIONS_OPTIONS.map((s) => (
                    <label key={s.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={reportSections.includes(s.id)} onChange={(e) => setReportSections(e.target.checked ? [...reportSections, s.id] : reportSections.filter((r) => r !== s.id))} className="h-4 w-4 rounded border-gray-300 accent-[#F59E0B]" />
                      <span className="text-xs font-semibold text-gray-700">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={generateReport} disabled={generatingReport || reportSections.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64500] disabled:opacity-50 transition">
                {generatingReport ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><BarChart2 size={14} /> Generate Report</>}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center gap-2 mb-2"><Book size={14} className="text-blue-600" /><p className="text-xs font-black text-blue-800">What gets included</p></div>
          <ul className="space-y-1.5">
            {["Live project stats & completion %", "Budget vs. actuals with variance", "RFI & submittal status summary", "Task schedule progress", "Daily log recap", "Open punch list items"].map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-[11px] text-blue-700"><CheckCircle2 size={10} className="text-blue-400 shrink-0" />{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Right: Preview ── */}
      <div className="xl:col-span-2">
        {!reportResult ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white h-full min-h-[400px] flex flex-col items-center justify-center gap-4">
            <BarChart2 size={40} className="text-gray-300" />
            <p className="text-sm font-semibold text-gray-500">Report preview will appear here</p>
            <p className="text-xs text-gray-400 max-w-xs text-center">Select report type and sections, then click Generate to compile a professional report from live project data.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="bg-[#F59E0B] px-6 py-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200 mb-1">Slate360 Professional Report</p>
              <h3 className="text-lg font-black text-white">{reportResult.title}</h3>
              <p className="text-[11px] text-blue-200 mt-1">Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Executive Summary</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Object.entries(reportResult.summary).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</p>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                <p className="text-xs text-gray-500">Report saved to project S3 archive</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => void openReportFile()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                    <Download size={12} /> Download JSON
                  </button>
                  <button onClick={() => setReportResult(null)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                    New Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

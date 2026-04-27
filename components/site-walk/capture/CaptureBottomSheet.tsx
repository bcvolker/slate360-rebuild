import { ClipboardList } from "lucide-react";

export function CaptureBottomSheet() {
  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-800">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-black text-slate-950">Capture details</h2>
          <p className="text-xs font-medium text-slate-600">Classification, notes, assignee, and sync state.</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">Title field placeholder</div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">Status / priority / assignee placeholder</div>
        <div className="min-h-24 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">Notes and AI cleanup placeholder</div>
      </div>
    </section>
  );
}

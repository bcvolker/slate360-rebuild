import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Paperclip } from "lucide-react";
import { OperationsConsoleNav } from "@/components/dashboard/operations-console/OperationsConsoleNav";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperationsConsoleCounts } from "@/lib/server/operations-console-counts";

export const metadata = { title: "Feedback Inbox — Operations Console" };
export const dynamic = "force-dynamic";

type FeedbackAttachment = {
  name?: string;
  type?: string;
  size?: number;
  dataUrl?: string;
};

type FeedbackRow = {
  id: string;
  user_id: string;
  type: string;
  severity: string | null;
  app_area: string | null;
  title: string;
  description: string;
  page_url: string | null;
  user_agent: string | null;
  console_errors: unknown;
  status: string;
  created_at: string;
};

export default async function OperationsFeedbackPage() {
  const { user, canAccessOperationsConsole } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!canAccessOperationsConsole) notFound();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("beta_feedback")
    .select("id,user_id,type,severity,app_area,title,description,page_url,user_agent,console_errors,status,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as FeedbackRow[];
  const counts = await getOperationsConsoleCounts();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-xl font-bold text-foreground">Feedback Inbox</h1>
        <p className="text-xs text-muted-foreground">Bugs, feature requests, attachments, session context, and reply workflow planning.</p>
      </header>

      <OperationsConsoleNav active="/operations-console/feedback" counts={counts} />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error.message}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
          No feedback submissions yet. New Version 1 feedback will appear here with page URL, user agent, replay ID, and attachments.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <FeedbackCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackCard({ row }: { row: FeedbackRow }) {
  const attachments = getAttachments(row.console_errors);
  return (
    <article className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{row.type}</Badge>
            {row.severity && <Badge>{row.severity}</Badge>}
            <Badge>{row.status}</Badge>
          </div>
          <h2 className="mt-3 text-base font-black text-slate-950">{row.title}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{row.description}</p>
        </div>
        <time className="text-xs font-semibold text-slate-500">{new Date(row.created_at).toLocaleString()}</time>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
        <p><strong>User:</strong> {row.user_id}</p>
        <p><strong>App area:</strong> {row.app_area ?? "Not specified"}</p>
        <p className="truncate"><strong>Page:</strong> {row.page_url ?? "—"}</p>
        <p className="truncate"><strong>Device:</strong> {row.user_agent ?? "—"}</p>
      </div>

      {attachments.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-700"><Paperclip className="h-4 w-4 text-blue-700" /> Attachments</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              attachment.dataUrl ? (
                <Link key={`${attachment.name}-${attachment.size}`} href={attachment.dataUrl} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-blue-700" target="_blank">
                  {attachment.name ?? "Attachment"}
                </Link>
              ) : (
                <span key={`${attachment.name}-${attachment.size}`} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  {attachment.name ?? "Attachment"}
                </span>
              )
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
        Reply workflow: admin replies should create a Coordination Inbox message for this user, update this feedback status, and preserve the full thread for audit history.
      </div>
    </article>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">{children}</span>;
}

function getAttachments(value: unknown): FeedbackAttachment[] {
  if (!value || typeof value !== "object" || !("attachments" in value)) return [];
  const attachments = (value as { attachments?: unknown }).attachments;
  if (!Array.isArray(attachments)) return [];
  return attachments.filter((item): item is FeedbackAttachment => Boolean(item && typeof item === "object"));
}

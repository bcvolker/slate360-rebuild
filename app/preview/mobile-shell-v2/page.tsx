import {
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Command,
  Bug,
  ChevronDown,
  ClipboardList,
  FileText,
  Files,
  FolderOpen,
  Lock,
  MessageSquare,
  Plus,
  Rocket,
  Search,
  Share2,
  Sparkles,
  User,
} from "lucide-react";

const apps = [
  { label: "Site Walk", status: "Active", locked: false },
  { label: "SlateDrop", status: "Active", locked: false },
  { label: "360 Tours", status: "Available", locked: true },
  { label: "Design Studio", status: "Available", locked: true },
];

const quickActions = [
  { label: "Quick Start", detail: "Launch any subscribed app", icon: Rocket, primary: true },
  { label: "New Project", detail: "Create a shared workspace", icon: Plus },
  { label: "Open SlateDrop", detail: "Files, shares, uploads", icon: Files },
  { label: "Assigned Tasks", detail: "Work assigned to you", icon: ClipboardList },
];

const projects = [
  { title: "Terminal 4 Expansion", meta: "Pinned · 4 open items" },
  { title: "Assigned: Photo review", meta: "Due today · Field Team" },
  { title: "Medical Tower B", meta: "All projects · synced" },
];

const recentWork = [
  { title: "Site walk draft", meta: "Pending sync", status: "pending" },
  { title: "Client deliverable", meta: "Completed 2h ago", status: "done" },
  { title: "SlateDrop upload", meta: "In-progress", status: "active" },
];

const threads = [
  { title: "Sarah Chen mentioned you", meta: "Unread thread" },
  { title: "Field Team uploaded files", meta: "Recent contact" },
  { title: "RFI response pending", meta: "Unread thread" },
];

export default function MobileShellV2() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="relative h-[800px] max-h-[90vh] w-full max-w-sm overflow-hidden rounded-[2.5rem] border-8 border-slate-800 bg-slate-50 shadow-2xl">
        <header className="absolute inset-x-0 top-0 z-20 bg-slate-900 px-4 pb-2 pt-10 text-white shadow-lg">
          <div className="flex min-h-[48px] items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <img
                src="/slate360-icon-color.png"
                alt="Slate360"
                className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain drop-shadow-[0_0_10px_rgba(59,130,246,0.35)]"
              />
              <button className="flex min-h-[40px] min-w-0 items-center gap-1 rounded-lg px-2 text-left transition-colors hover:bg-white/10" aria-label="Workspace and account menu">
                <span className="max-w-[92px] truncate text-xs font-semibold text-slate-200">Brian Volker</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              </button>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white" aria-label="Share">
                <Share2 className="h-[18px] w-[18px]" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white" aria-label="Search">
                <Search className="h-[18px] w-[18px]" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white" aria-label="Report a bug or suggest a feature">
                <Bug className="h-[18px] w-[18px]" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white" aria-label="Notifications and coordination hub">
                <Bell className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </header>

        <main className="absolute inset-x-0 bottom-[80px] top-[100px] overflow-y-auto px-5 py-6 space-y-5">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-700">Your Apps</h2>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">Synced</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {apps.map((app) => (
                <button key={app.label} className={`relative min-h-[96px] rounded-2xl border border-slate-300 bg-white p-3 text-left shadow-sm transition-all duration-200 ${app.locked ? "opacity-60" : "hover:border-blue-600 hover:shadow-md"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      {app.locked ? <Lock className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{app.status}</span>
                  </div>
                  <p className="mt-3 text-sm font-black text-slate-900">{app.label}</p>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button key={action.label} className={`min-h-[104px] rounded-2xl border p-3 text-left shadow-sm transition-all duration-200 ${action.primary ? "border-blue-700 bg-blue-600 text-white shadow-blue-600/20" : "border-slate-300 bg-white text-slate-900 hover:border-blue-600"}`}>
                  <action.icon className="h-5 w-5" />
                  <p className="mt-3 text-sm font-black">{action.label}</p>
                  <p className={`mt-1 text-[11px] ${action.primary ? "text-blue-100" : "text-slate-600"}`}>{action.detail}</p>
                </button>
              ))}
            </div>
          </section>

          <ContainedHub title="Projects & Tasks" tabs={["Pinned", "All", "Assigned Tasks"]} items={projects} icon={FolderOpen} />
          <ContainedHub title="Recent Work & Drafts" tabs={["In-Progress", "Completed"]} items={recentWork} icon={FileText} />
          <ContainedHub title="Coordination Hub" tabs={["Unread Threads", "Recent Contacts"]} items={threads} icon={MessageSquare} cta="Open" />
        </main>

        <nav className="absolute inset-x-0 bottom-0 flex h-[80px] items-center justify-between border-t border-slate-800 bg-slate-900/95 px-6 text-slate-400 backdrop-blur-xl">
          {[
            { label: "Home", icon: Command, active: true },
            { label: "Projects", icon: FolderOpen },
            { label: "Tasks", icon: ClipboardCheck },
            { label: "Files", icon: Files },
            { label: "Account", icon: User },
          ].map((item) => (
            <button key={item.label} className={`flex h-full min-w-[44px] flex-col items-center justify-center gap-1 text-[10px] font-semibold ${item.active ? "text-blue-400" : "hover:text-white"}`}>
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function ContainedHub({
  title,
  tabs,
  items,
  icon: Icon,
  cta,
}: {
  title: string;
  tabs: string[];
  items: { title: string; meta: string; status?: string }[];
  icon: typeof FolderOpen;
  cta?: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700">
          <Icon className="h-4 w-4 text-blue-600" /> {title}
        </h2>
        {cta ? <span className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-blue-700">{cta}</span> : null}
      </div>
      <div className="mb-3 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {tabs.map((tab, index) => (
          <button key={tab} className={`min-h-[36px] shrink-0 rounded-lg px-3 text-[11px] font-bold ${index === 0 ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}>
            {tab}
          </button>
        ))}
      </div>
      <div className="max-h-[164px] overflow-y-auto space-y-1">
        {items.map((item) => (
          <div key={item.title} className="flex items-center justify-between gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
              <p className="text-xs text-slate-600">{item.meta}</p>
            </div>
            {item.status === "done" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

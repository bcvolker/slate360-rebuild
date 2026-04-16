import { Home, FolderOpen, Files, CheckSquare, User, Search, Bell, Plus, Star, ChevronRight, Zap, MessageSquare, AlertCircle } from "lucide-react";

export default function MobileShellPreview() {
  return (
    <div className="min-h-screen bg-slate-950 dark flex items-center justify-center p-4">
      {/* Mobile Phone Frame */}
      <div className="relative w-full max-w-sm bg-slate-950 rounded-3xl shadow-2xl overflow-hidden border-8 border-slate-900" style={{ aspectRatio: "9/19.5" }}>
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-slate-950 rounded-b-3xl z-50 border-b-2 border-slate-800" />

        {/* Main Container */}
        <div className="h-full w-full flex flex-col bg-slate-950 relative">
          {/* Proof Header */}
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 text-center">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Slate360 Mobile Shell Preview</p>
            <p className="text-xs text-amber-400 mt-1">Home screen proof</p>
          </div>

          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-900/50">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L20 6V10L12 14L4 10V6L12 2Z" fill="#D4AF37" opacity="0.8" />
                <path d="M12 10L20 14V18L12 22L4 18V14L12 10Z" fill="#D4AF37" />
              </svg>
              <span className="text-xs font-bold text-slate-300 tracking-widest hidden sm:inline">SLATE360</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-slate-900 rounded-lg transition-colors">
                <Search size={18} className="text-slate-400" />
              </button>
              <button className="p-2 hover:bg-slate-900 rounded-lg transition-colors relative">
                <Bell size={18} className="text-slate-400" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />
              </button>
              <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                <span className="text-xs font-bold text-amber-500">JD</span>
              </div>
            </div>
          </div>

          {/* Content - Home Screen Only */}
          <div className="flex-1 overflow-y-auto px-3 py-4 pb-24 space-y-5">
            {/* PRIORITY 1: Subscribed Apps / App Launcher */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 px-1">Subscribed Apps</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "360 Tours", icon: "360" },
                  { label: "Design Studio", icon: "DSN" },
                  { label: "Content Studio", icon: "CNT" },
                ].map((app, idx) => (
                  <button
                    key={idx}
                    className="aspect-square bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-amber-500/50 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-amber-500/20"
                  >
                    <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-bold text-amber-500">{app.icon}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-200 text-center px-1">{app.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* PRIORITY 2: Notifications & Active Work Feed */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Active Items</h3>
                <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-amber-500/30 text-amber-300 rounded">2</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Review pending", type: "review" },
                  { label: "Field update awaiting response", type: "update" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-slate-900/80 border border-amber-500/30 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <AlertCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200">{item.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Action required</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-600" />
                  </div>
                ))}
              </div>
            </div>

            {/* PRIORITY 3: Quick Actions (Workflow-Driven) */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 px-1">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Plus, label: "New Project", color: "bg-emerald-500/20 hover:bg-emerald-500/30" },
                  { icon: Zap, label: "Continue Work", color: "bg-blue-500/20 hover:bg-blue-500/30" },
                  { icon: Files, label: "Open Files", color: "bg-purple-500/20 hover:bg-purple-500/30" },
                  { icon: MessageSquare, label: "Report / Suggest", color: "bg-slate-700/50 hover:bg-slate-700/70" },
                ].map((action, idx) => (
                  <button
                    key={idx}
                    className={`p-3 bg-slate-900/60 border border-slate-800 rounded-lg transition-all flex flex-col items-center gap-2 hover:shadow-md`}
                  >
                    <div className={`p-2 rounded-lg transition-colors ${action.color}`}>
                      <action.icon size={16} className="text-slate-100" />
                    </div>
                    <span className="text-xs font-medium text-slate-300 text-center">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* PRIORITY 4: Pinned Projects (Lower Priority) */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Pinned Projects</h3>
              <div className="space-y-2">
                {[1, 2].map((idx) => (
                  <div key={idx} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Star size={14} className="text-slate-600 flex-shrink-0" fill="currentColor" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-300">Project</p>
                        <p className="text-xs text-slate-500">Multiple files</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-600" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PRIORITY 5: Quick Search / Browse */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Find & Browse</h3>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search projects, files..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* Bottom Navigation - Static */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-20 bg-slate-950/95 border-t border-slate-900/50 backdrop-blur-sm px-2">
            {[
              { icon: Home, label: "Home", active: true },
              { icon: FolderOpen, label: "Projects" },
              { icon: Files, label: "Files" },
              { icon: CheckSquare, label: "Tasks" },
              { icon: User, label: "Account" },
            ].map((nav, idx) => (
              <button
                key={idx}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg transition-all text-xs font-medium ${
                  nav.active ? "text-amber-500 bg-amber-500/10" : "text-slate-500 hover:text-slate-400"
                }`}
              >
                <nav.icon size={18} />
                <span className="text-xs">{nav.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

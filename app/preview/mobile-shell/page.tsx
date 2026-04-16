import { Home, FolderOpen, Files, CheckSquare, User, Search, Bell, Plus, Star, ChevronRight, Zap, MessageSquare, AlertCircle, MapPin, Camera, Palette, BookOpen } from "lucide-react";

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

          {/* Top Bar - Enhanced Branding */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-amber-500/20">
            {/* Logo - Stronger Slate360 Branding */}
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="slate360gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#D4AF37" stopOpacity="1" />
                      <stop offset="100%" stopColor="#C4A027" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>
                  <path d="M12 2L20 6V10L12 14L4 10V6L12 2Z" fill="url(#slate360gradient)" />
                  <path d="M12 10L20 14V18L12 22L4 18V14L12 10Z" fill="#D4AF37" />
                </svg>
              </div>
              <span className="text-xs font-bold text-amber-300 tracking-widest hidden sm:inline">SLATE360</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button className="p-2 hover:bg-slate-900 rounded-lg transition-colors">
                <Search size={18} className="text-slate-400" />
              </button>
              <button className="p-2 hover:bg-slate-900 rounded-lg transition-colors relative">
                <Bell size={18} className="text-slate-400" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />
              </button>
              <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center border border-amber-500/50">
                <span className="text-xs font-bold text-amber-500">JD</span>
              </div>
            </div>
          </div>

          {/* Content - Home Screen Only */}
          <div className="flex-1 overflow-y-auto px-3 py-4 pb-24 space-y-6">
            {/* PRIORITY 1: Subscribed Apps - Premium Adaptive Grid */}
            <div>
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2 px-1">Apps</h3>
              <div className="flex justify-center w-full">
                <div className="grid gap-x-3 gap-y-3 w-full max-w-[202px]" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                  {[
                    { label: "Site Walk", icon: MapPin, status: "live" },
                    { label: "360 Tours", icon: Camera, status: "coming" },
                    { label: "Design Studio", icon: Palette, status: "coming" },
                    { label: "Content Studio", icon: BookOpen, status: "coming" },
                  ].map((app, idx) => (
                    <button
                      key={idx}
                      className="relative group"
                    >
                      <div className="aspect-square bg-slate-800/40 border border-slate-700 hover:border-amber-500/60 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all hover:bg-slate-800/80 hover:shadow-md hover:shadow-amber-500/20">
                        <div className="p-1.5 bg-slate-700/50 group-hover:bg-slate-700 rounded-md transition-colors">
                          <app.icon size={11} className="text-slate-300 group-hover:text-amber-300" />
                        </div>
                        <span className="text-xs font-medium text-slate-100 text-center px-0.5 leading-tight">{app.label}</span>
                        {app.status === "coming" && (
                          <span className="text-xs font-medium text-slate-500 opacity-75 text-center leading-none">Coming<br />Soon</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PRIORITY 2: Communications & Workflow Feed */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Notifications</h3>
                <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded-sm">3</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Design review requested", source: "Sarah Chen", type: "review", time: "2h ago" },
                  { label: "Contractor uploaded files", source: "Field Team", type: "upload", time: "4h ago" },
                  { label: "Specification update pending", source: "System", type: "submission", time: "1d ago" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-slate-900/60 border border-slate-800 hover:bg-slate-800/80 hover:border-amber-500/40 transition-all cursor-pointer"
                  >
                    <div className="pt-1 flex-shrink-0">
                      {item.type === "review" && <AlertCircle size={14} className="text-amber-500" />}
                      {item.type === "upload" && <MessageSquare size={14} className="text-cyan-400" />}
                      {item.type === "submission" && <CheckSquare size={14} className="text-emerald-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200">{item.label}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-500">{item.source}</p>
                        <p className="text-xs text-slate-600">{item.time}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 flex-shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            </div>

            {/* PRIORITY 3: Quick Actions - Entitlement Aware */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Plus, label: "New Project" },
                  { icon: Zap, label: "Continue Work" },
                  { icon: Files, label: "Open Files" },
                  { icon: MessageSquare, label: "Report & Suggest" },
                ].map((action, idx) => (
                  <button
                    key={idx}
                    className="p-3 bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 rounded-lg transition-all flex flex-col items-center gap-2 hover:bg-slate-800/80 hover:shadow-md"
                  >
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <action.icon size={16} className="text-amber-300" />
                    </div>
                    <span className="text-xs font-medium text-slate-300 text-center">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* PRIORITY 4: Pinned Projects - Lower Prominence */}
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">Pinned</h3>
              <div className="space-y-1">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-900/40 border border-slate-800/50 hover:bg-slate-800/60 transition-colors cursor-pointer rounded">
                    <Star size={12} className="text-slate-600 flex-shrink-0" fill="currentColor" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-400">Project</p>
                    </div>
                    <ChevronRight size={12} className="text-slate-700" />
                  </div>
                ))}
              </div>
            </div>

            {/* PRIORITY 5: Quick Search */}
            <div className="pt-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/40 border border-slate-800/50 rounded-lg text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Bottom Navigation - Static */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-20 bg-slate-950/95 border-t border-amber-500/10 backdrop-blur-sm px-2">
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

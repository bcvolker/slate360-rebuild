import { Home, FolderOpen, Files, CheckSquare, User, Search, Bell, Plus, Star, ChevronRight, Zap, MessageSquare, AlertCircle, MapPin, ChevronDown } from "lucide-react";

export default function MobileShellPreview() {
  const apps = [
    { label: "Site Walk", icon: MapPin },
  ];

  // Calculate grid layout based on app count
  const getGridClass = () => {
    const count = apps.length;
    if (count === 1) return "grid grid-cols-1 place-items-center";
    if (count === 2) return "grid grid-cols-2";
    if (count === 3) return "grid grid-cols-2";
    if (count === 4) return "grid grid-cols-2";
    return "grid grid-cols-2";
  };

  const workFeedItems = [
    { label: "Design review requested", source: "Sarah Chen", type: "review", time: "2h ago" },
    { label: "Contractor uploaded files", source: "Field Team", type: "upload", time: "4h ago" },
    { label: "Specification update pending", source: "System", type: "submission", time: "1d ago" },
  ];

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

          {/* Top Bar - Premium Slate360 Branding */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
            {/* Logo */}
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
              <span className="text-xs font-bold text-slate-200 tracking-widest hidden sm:inline">SLATE360</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button className="p-2 hover:bg-slate-900 rounded-lg transition-colors">
                <Search size={18} className="text-slate-500" />
              </button>
              <button className="p-2 hover:bg-slate-900 rounded-lg transition-colors relative">
                <Bell size={18} className="text-slate-500" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />
              </button>
              <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                <span className="text-xs font-bold text-slate-300">JD</span>
              </div>
            </div>
          </div>

          {/* Content - Home Screen Only */}
          <div className="flex-1 overflow-y-auto px-4 py-5 pb-24 space-y-6">
            {/* SECTION 1: Apps - Premium Grid Container */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Apps</h3>
              <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl backdrop-blur-sm">
                <div className={`gap-3 ${getGridClass()}`}>
                  {apps.map((app, idx) => (
                    <button
                      key={idx}
                      className="w-full max-w-xs"
                    >
                      <div className="aspect-square bg-gradient-to-br from-slate-800 to-slate-850 border border-amber-500/30 hover:border-amber-500/60 rounded-lg flex flex-col items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-amber-500/20 group hover:bg-slate-800">
                        <div className="p-2.5 bg-slate-700/50 group-hover:bg-slate-700 rounded-lg transition-colors">
                          <app.icon size={20} className="text-slate-300 group-hover:text-amber-400" />
                        </div>
                        <span className="text-xs font-medium text-slate-200 text-center">{app.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {apps.length < 4 && (
                  <button className="w-full mt-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-400 transition-colors border border-dashed border-slate-700 hover:border-slate-600 rounded-lg">
                    Discover more apps
                  </button>
                )}
              </div>
            </div>

            {/* SECTION 2: Work Feed - Communications Oriented */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Work Feed</h3>
                <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-slate-800 text-slate-300 rounded">3</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {workFeedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-2.5 bg-slate-800/40 hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-700"
                    >
                      <div className="pt-0.5 flex-shrink-0">
                        {item.type === "review" && <AlertCircle size={14} className="text-slate-400" />}
                        {item.type === "upload" && <MessageSquare size={14} className="text-slate-400" />}
                        {item.type === "submission" && <CheckSquare size={14} className="text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200">{item.label}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-slate-500">{item.source}</p>
                          <p className="text-xs text-slate-600">{item.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 3: Quick Actions - Premium Compact */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Plus, label: "New Project" },
                  { icon: Zap, label: "Continue Work" },
                  { icon: Files, label: "Open Files" },
                  { icon: MessageSquare, label: "Report & Suggest" },
                ].map((action, idx) => (
                  <button
                    key={idx}
                    className="p-3 bg-slate-800/50 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 rounded-lg transition-all flex flex-col items-center gap-2"
                  >
                    <div className="p-1.5 bg-slate-700/60 rounded-lg">
                      <action.icon size={16} className="text-slate-300" />
                    </div>
                    <span className="text-xs font-medium text-slate-300 text-center">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION 4: Projects - With Subtle Toggle */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Projects</h3>
                <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg">
                  <button className="px-2 py-1 text-xs font-medium text-slate-300 bg-slate-700 rounded transition-colors">
                    Pinned
                  </button>
                  <button className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-400 transition-colors">
                    All
                  </button>
                </div>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                  {[1, 2, 3].map((idx) => (
                    <div key={idx} className="flex items-center gap-2.5 p-2 bg-slate-800/40 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer">
                      <Star size={12} className="text-slate-600 flex-shrink-0" fill="currentColor" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-400">Project name</p>
                      </div>
                      <ChevronRight size={12} className="text-slate-600" />
                    </div>
                  ))}
                </div>
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

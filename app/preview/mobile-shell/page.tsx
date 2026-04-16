import { Home, FolderOpen, Files, CheckSquare, User, Search, Bell, Plus, Star, ChevronRight, MapPin } from "lucide-react";

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
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Slate360 Mobile Shell Preview</p>
          </div>

          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L20 6V10L12 14L4 10V6L12 2Z" fill="#D4AF37" opacity="0.8" />
                <path d="M12 10L20 14V18L12 22L4 18V14L12 10Z" fill="#D4AF37" />
              </svg>
              <span className="text-xs font-bold text-slate-300 hidden sm:inline">SLATE360</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 hover:bg-slate-900 rounded-lg">
                <Search size={16} className="text-slate-500" />
              </button>
              <button className="p-2 hover:bg-slate-900 rounded-lg relative">
                <Bell size={16} className="text-slate-500" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />
              </button>
              <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                <span className="text-xs font-bold text-slate-300">JD</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-3 py-3 pb-20 space-y-3">
            {/* Apps */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Apps</h3>
              <div className="grid grid-cols-2 gap-2">
                <button className="aspect-square bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all">
                  <MapPin size={16} className="text-slate-400" />
                  <span className="text-xs font-medium text-slate-300">Site Walk</span>
                </button>
                <button className="aspect-square bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all">
                  <Plus size={16} className="text-slate-500" />
                  <span className="text-xs font-medium text-slate-400">More</span>
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Notifications</h3>
                <span className="text-xs font-semibold text-amber-500">3</span>
              </div>
              <div className="space-y-1.5">
                {[
                  "Design review requested",
                  "Field upload pending",
                  "Specification update",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-slate-800/50 border border-slate-700 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                    <p className="text-xs font-medium text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Plus, label: "New" },
                  { icon: Files, label: "Files" },
                  { icon: Star, label: "Pinned" },
                  { icon: ChevronRight, label: "Browse" },
                ].map((action, idx) => (
                  <button key={idx} className="p-2 bg-slate-800/50 border border-slate-700 hover:border-slate-600 rounded-lg flex flex-col items-center gap-1 transition-colors">
                    <action.icon size={14} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-400">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pinned Projects */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pinned</h3>
              <div className="space-y-1">
                {[1, 2].map((idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-800/30 border border-slate-800 rounded hover:bg-slate-800/50 transition-colors cursor-pointer">
                    <Star size={10} className="text-slate-600" fill="currentColor" />
                    <p className="text-xs text-slate-400">Project</p>
                    <ChevronRight size={10} className="text-slate-600 ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-16 bg-slate-950/95 border-t border-slate-800 px-2">
            {[
              { icon: Home, label: "Home", active: true },
              { icon: FolderOpen, label: "Projects" },
              { icon: Files, label: "Files" },
              { icon: CheckSquare, label: "Tasks" },
              { icon: User, label: "Account" },
            ].map((nav, idx) => (
              <button
                key={idx}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded text-xs font-medium ${
                  nav.active ? "text-amber-500" : "text-slate-500 hover:text-slate-400"
                }`}
              >
                <nav.icon size={16} />
                <span className="text-xs">{nav.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

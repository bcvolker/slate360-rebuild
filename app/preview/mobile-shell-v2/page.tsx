import { Home, FolderOpen, Files, CheckSquare, User, Search, Plus, Star, ChevronRight, MessageSquare, AlertCircle, MapPin, Camera, Palette, BookOpen, QrCode, Bug, ChevronDown } from "lucide-react";

export default function MobileShellV2() {
  const apps = [
    { label: "Site Walk", icon: MapPin, status: "live" },
    { label: "360 Tours", icon: Camera, status: "coming" },
    { label: "Design Studio", icon: Palette, status: "coming" },
    { label: "Content Studio", icon: BookOpen, status: "coming" },
  ];

  // Calculate grid layout based on app count
  const getAppGridLayout = () => {
    const count = apps.length;
    if (count === 1) return { cols: "grid-cols-1", maxW: "max-w-[140px]" };
    if (count === 2) return { cols: "grid-cols-2", maxW: "max-w-[240px]" };
    if (count === 3) return { cols: "grid-cols-2", maxW: "max-w-[240px]" };
    return { cols: "grid-cols-2", maxW: "max-w-[240px]" };
  };

  const gridLayout = getAppGridLayout();

  return (
    <div className="min-h-screen bg-slate-950 dark flex items-center justify-center p-4">
      {/* Mobile Phone Frame */}
      <div className="relative w-full max-w-sm bg-[#0B0F15] rounded-[2.5rem] shadow-2xl overflow-hidden border-8 border-[#151A23] h-[800px] max-h-[90vh]">
        
        {/* Top Bar - Premium Brand Treatment */}
        <div className="flex items-center justify-between px-5 pt-12 pb-4 bg-[#0B0F15] border-b border-white/5">
          {/* Logo & Workspace Dropdown */}
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 flex-shrink-0 flex items-center justify-center bg-[#151A23] rounded-lg border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.15)] overflow-hidden p-1">
              <img src="/icon.svg" alt="Slate360 Logo" className="w-full h-full object-contain drop-shadow-md" />
            </div>
            
            {/* Workspace Indicator replacing standalone JD */}
            <button className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors group">
              <span className="text-[12px] font-semibold text-slate-200 tracking-wide">JD Workspace</span>
              <ChevronDown size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
            </button>
          </div>

          {/* Global Actions */}
          <div className="flex items-center gap-3">
            {/* Omnipresent Beta Feedback Button */}
            <button className="relative p-1.5 text-slate-400 hover:text-amber-500 transition-colors group">
              <div className="absolute inset-0 bg-amber-500/10 rounded-full scale-0 group-hover:scale-100 transition-transform" />
              <Bug size={18} />
            </button>
            <button className="text-slate-400 hover:text-amber-500 transition-colors">
              <Search size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="absolute top-[80px] bottom-[80px] left-0 right-0 overflow-y-auto px-5 py-6 space-y-8 scrollbar-hide">
          
          {/* PRIORITY 1: Subscribed Apps (Gems in a Tray) */}
          <section>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Your Apps</h3>
            <div className="flex justify-start">
              <div className={`grid gap-3 w-full ${gridLayout.cols}`}>
                {apps.map((app, idx) => {
                  // Determine ambient glow color based on app identity
                  let glowColor = "group-hover:bg-amber-500/15";
                  let iconColor = "text-amber-500";
                  if (app.label === "360 Tours") { glowColor = "group-hover:bg-[#94A3B8]/20"; iconColor = "text-[#94A3B8]"; }
                  if (app.label === "Design Studio") { glowColor = "group-hover:bg-slate-300/15"; iconColor = "text-slate-300"; }
                  if (app.label === "Content Studio") { glowColor = "group-hover:bg-slate-500/15"; iconColor = "text-slate-500"; }

                  return (
                    <button
                      key={idx}
                      className="relative group h-24 bg-[#151A23] border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] overflow-hidden"
                    >
                      {/* Ambient Background Glow Effect */}
                      <div className={`absolute inset-0 opacity-0 transition-opacity duration-300 ${glowColor}`} />
                      
                      <div className="relative p-2.5 bg-[#0B0F15] rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-inner z-10">
                        <app.icon size={18} className={iconColor} />
                      </div>
                      <span className="relative text-[11px] font-medium text-slate-300 z-10 group-hover:text-white transition-colors">{app.label}</span>
                      
                      {app.status === "coming" && (
                        <span className="absolute top-2 right-2 text-[8px] font-bold text-slate-500 uppercase tracking-wider z-10">Soon</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* PRIORITY 3: Quick Actions (Updated for global relevance) */}
          <section>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Plus, label: "New Project" },
                { icon: QrCode, label: "Quick Share" },
                { icon: Files, label: "Upload Files" },
                { icon: Camera, label: "Quick Capture" },
              ].map((action, idx) => (
                <button
                  key={idx}
                  className="h-24 bg-[#151A23] border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] group"
                >
                  <div className="p-2.5 bg-[#0B0F15] rounded-xl group-hover:scale-110 transition-transform">
                    {/* Using muted teal-smoke secondary accent for quick actions as per guidelines */}
                    <action.icon size={18} className="text-[#94A3B8]" /> 
                  </div>
                  <span className="text-[11px] font-medium text-slate-300">{action.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* PRIORITY 2: Communications Center Preview (Contained Section) */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Communications Center</h3>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  3 New
                </span>
                <button className="flex items-center gap-1 text-[10px] font-medium text-[#94A3B8] hover:text-amber-500 transition-colors group">
                  Open Hub
                  <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
            
            {/* Contained Scrolling Area - Height adjusted to peek 3rd item */}
            <div className="bg-[#151A23] border border-white/5 rounded-2xl overflow-hidden relative">
              <div className="max-h-[172px] overflow-y-auto p-2 space-y-1 scrollbar-hide">
                {[
                  { label: "Design review requested", source: "Sarah Chen", type: "review", time: "2h ago" },
                  { label: "Contractor uploaded files", source: "Field Team", type: "upload", time: "4h ago" },
                  { label: "Specification update", source: "System", type: "submission", time: "1d ago" },
                  { label: "RFI Response pending", source: "John Doe", type: "review", time: "2d ago" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/[0.04] hover:pl-4 cursor-pointer group"
                  >
                    <div className="mt-0.5">
                      {item.type === "review" && <AlertCircle size={14} className="text-[#94A3B8]" />}
                      {item.type === "upload" && <MessageSquare size={14} className="text-amber-500" />}
                      {item.type === "submission" && <CheckSquare size={14} className="text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-slate-200 truncate">{item.label}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-slate-500">{item.source}</p>
                        <p className="text-[10px] text-slate-600">{item.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Soft Fade to imply more content */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#151A23] to-transparent pointer-events-none" />
            </div>
          </section>

          {/* PRIORITY 4: Projects with Subtle Toggle (Now matching Communications Center) */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Projects</h3>
              
              {/* Subtle Toggle: Pinned | All */}
              <div className="flex bg-[#151A23] p-0.5 rounded-lg border border-white/5">
                <button className="px-3 py-1 text-[10px] font-medium bg-white/10 text-slate-200 rounded-md shadow-sm transition-all duration-200">
                  Pinned
                </button>
                <button className="px-3 py-1 text-[10px] font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-md transition-all duration-200">
                  All
                </button>
              </div>
            </div>

            {/* Contained Scrolling Area - Matching UI to Communications Center */}
            <div className="bg-[#151A23] border border-white/5 rounded-2xl overflow-hidden relative">
              <div className="max-h-[172px] overflow-y-auto p-2 space-y-1 scrollbar-hide">
                {[
                  { name: "Terminal 4 Expansion", date: "Updated 2h ago", pinned: true },
                  { name: "Medical Tower B", date: "Updated 1d ago", pinned: true },
                  { name: "University Life Sciences", date: "Updated 3d ago", pinned: true },
                  { name: "Downtown Office Park", date: "Updated 1w ago", pinned: true },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/[0.04] hover:pl-4 cursor-pointer group">
                    <Star size={14} className="text-amber-500 flex-shrink-0" fill={item.pinned ? "currentColor" : "none"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-slate-200 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{item.date}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
              ))}
              </div>
              {/* Soft Fade to imply more content */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#151A23] to-transparent pointer-events-none" />
            </div>
          </section>

        </div>

        {/* Bottom Navigation - Glassy / Premium */}
        <div className="absolute bottom-0 left-0 right-0 h-[80px] bg-[#0B0F15]/80 backdrop-blur-xl border-t border-white/5 px-6 flex justify-between items-center pb-safe">
          {[
            { icon: Home, label: "Home", active: true },
            { icon: FolderOpen, label: "Projects" },
            { icon: Files, label: "Files" },
            { icon: CheckSquare, label: "Tasks" },
            { icon: User, label: "Account" },
          ].map((nav, idx) => (
            <button
              key={idx}
              className={`group flex flex-col items-center justify-center gap-1.5 w-14 h-full relative transition-all duration-300 ${
                nav.active 
                  ? "text-slate-200" 
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {/* Active state top border indicator */}
              {nav.active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-amber-500 rounded-b-full shadow-[0_2px_8px_rgba(59,130,246,0.5)]" />
              )}
              
              <div className={`relative transition-transform duration-300 ${nav.active ? "-translate-y-1" : "group-hover:-translate-y-1"}`}>
                <nav.icon size={22} strokeWidth={nav.active ? 2.5 : 2} className={nav.active ? "text-amber-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]" : ""} />
              </div>
              
              <span className={`text-[10px] font-medium transition-all duration-300 ${nav.active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 absolute bottom-3"}`}>
                {nav.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
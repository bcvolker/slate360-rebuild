import {
  Home, FolderOpen, Files, CheckSquare, User, Search, Bell,
  Plus, Star, ChevronRight, Zap, MessageSquare, AlertCircle,
  MapPin, Camera, Palette, BookOpen,
} from "lucide-react";
import { SlateContainedSection, SlateSubtleToggle } from "@/lib/design-system";

export default function MobileShellPreview() {
  const apps = [
    { label: "Site Walk", icon: MapPin, status: "live" as const },
    { label: "360 Tours", icon: Camera, status: "coming" as const },
    { label: "Design Studio", icon: Palette, status: "coming" as const },
    { label: "Content Studio", icon: BookOpen, status: "coming" as const },
  ];

  const gridLayout = { cols: "grid-cols-2", maxW: "max-w-[240px]" };

  return (
    <div className="min-h-screen bg-background dark flex items-center justify-center p-4">
      {/* Mobile Phone Frame */}
      <div
        className="relative w-full max-w-sm bg-background rounded-3xl shadow-2xl overflow-hidden border-8 border-border"
        style={{ aspectRatio: "9/19.5" }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-background rounded-b-3xl z-50 border-b-2 border-border" />

        {/* Main Container */}
        <div className="h-full w-full flex flex-col bg-background relative">
          {/* Proof Header */}
          <div className="bg-primary/10 border-b border-primary/30 px-4 py-3 text-center">
            <p className="text-xs font-bold text-primary uppercase tracking-wider">
              Slate360 Mobile Shell Preview
            </p>
            <p className="text-xs text-primary/70 mt-1">Home screen proof</p>
          </div>

          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-primary/20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L20 6V10L12 14L4 10V6L12 2Z" className="fill-primary" />
                  <path d="M12 10L20 14V18L12 22L4 18V14L12 10Z" className="fill-primary/80" />
                </svg>
              </div>
              <span className="text-xs font-bold text-primary tracking-widest hidden sm:inline">
                SLATE360
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button className="p-2 hover:bg-card rounded-lg transition-colors">
                <Search size={18} className="text-muted-foreground" />
              </button>
              <button className="p-2 hover:bg-card rounded-lg transition-colors relative">
                <Bell size={18} className="text-muted-foreground" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
              </button>
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                JD
              </div>
            </div>
          </div>

          {/* Content — Home Screen */}
          <div className="flex-1 overflow-y-auto scrollbar-none px-3 py-4 pb-24 space-y-6">

            {/* Apps */}
            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2 px-1">
                Apps
              </h3>
              <div className="flex justify-center w-full">
                <div className={`grid gap-x-3 gap-y-2 w-full ${gridLayout.cols} ${gridLayout.maxW}`}>
                  {apps.map((app, idx) => (
                    <button key={idx} className="relative group">
                      <div className="h-16 bg-card/50 border border-border hover:border-primary rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all hover:bg-card">
                        <div className="p-1 bg-primary/10 rounded-md">
                          <app.icon size={12} className="text-primary" />
                        </div>
                        <span className="text-xs font-medium text-foreground text-center px-0.5 line-clamp-2">
                          {app.label}
                        </span>
                        {app.status === "coming" && (
                          <span
                            className="text-xs font-medium text-muted-foreground/60 text-center leading-tight"
                            style={{ fontSize: "9px" }}
                          >
                            Coming Soon
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Communications / Notifications — with SlateContainedSection */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Notifications
                </h3>
                <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-primary text-primary-foreground rounded-sm">
                  3
                </span>
              </div>
              <SlateContainedSection maxHeight="200px" fadeMask>
                <div className="space-y-2">
                  {[
                    { label: "Design review requested", source: "Sarah Chen", type: "review", time: "2h ago" },
                    { label: "Contractor uploaded files", source: "Field Team", type: "upload", time: "4h ago" },
                    { label: "Specification update pending", source: "System", type: "submission", time: "1d ago" },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-card/50 border border-border hover:border-primary rounded-lg transition-all cursor-pointer hover:bg-card"
                    >
                      <div className="pt-1 flex-shrink-0">
                        {item.type === "review" && <AlertCircle size={14} className="text-primary" />}
                        {item.type === "upload" && <MessageSquare size={14} className="text-primary" />}
                        {item.type === "submission" && <CheckSquare size={14} className="text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-muted-foreground">{item.source}</p>
                          <p className="text-xs text-muted-foreground/60">{item.time}</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </SlateContainedSection>
              {/* Communications Center entry affordance */}
              <div className="mt-2 px-1">
                <button className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
                  Communications Center <ChevronRight size={12} />
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 px-1">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Plus, label: "New Project" },
                  { icon: Zap, label: "Continue Work" },
                  { icon: Files, label: "Open Files" },
                  { icon: MessageSquare, label: "Report & Suggest" },
                ].map((action, idx) => (
                  <button
                    key={idx}
                    className="h-20 bg-card/50 border border-border hover:border-primary rounded-xl transition-all flex flex-col items-center justify-center gap-1 hover:bg-card"
                  >
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                      <action.icon size={14} className="text-primary" />
                    </div>
                    <span className="text-xs font-medium text-foreground text-center px-0.5">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pinned Projects — with SlateSubtleToggle */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Projects
                </h3>
                <SlateSubtleToggle
                  options={["Pinned", "All"]}
                  active="Pinned"
                  onChange={() => {}}
                />
              </div>
              <SlateContainedSection maxHeight="140px" fadeMask>
                <div className="space-y-1">
                  {[1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-card/40 border border-border hover:border-primary rounded-lg transition-colors cursor-pointer"
                    >
                      <Star size={12} className="text-muted-foreground flex-shrink-0" fill="currentColor" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">Project {idx}</p>
                      </div>
                      <ChevronRight size={12} className="text-muted-foreground/60" />
                    </div>
                  ))}
                </div>
              </SlateContainedSection>
            </div>

            {/* Quick Search */}
            <div className="pt-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-card/40 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-20 bg-background/95 border-t border-border backdrop-blur-sm px-2">
            {[
              { icon: Home, label: "Home", active: true },
              { icon: FolderOpen, label: "Projects", active: false },
              { icon: Files, label: "Files", active: false },
              { icon: CheckSquare, label: "Tasks", active: false },
              { icon: User, label: "Account", active: false },
            ].map((nav, idx) => (
              <button
                key={idx}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg transition-all text-xs font-medium ${
                  nav.active
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
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

"use client";

import { useState } from "react";
import {
  Home,
  FolderOpen,
  Files,
  CheckSquare,
  User,
  Search,
  Bell,
  Plus,
  Clock,
  MapPin,
  MessageSquare,
  Settings,
  HelpCircle,
  Download,
  BarChart3,
  ChevronRight,
  Star,
  Folder,
  Archive,
  Share2,
  MoreVertical,
} from "lucide-react";

type Tab = "home" | "projects" | "files" | "tasks" | "account";

export default function MobileShellPreview() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [filesContext, setFilesContext] = useState<"root" | "project">("root");

  return (
    <div className="min-h-screen bg-slate-950 dark overflow-hidden">
      {/* Mobile Phone Frame Wrapper */}
      <div className="flex items-center justify-center min-h-screen p-4 dark">
        <div className="relative w-full max-w-sm bg-slate-950 rounded-3xl shadow-2xl overflow-hidden border-8 border-slate-900" style={{ aspectRatio: "9/19.5" }}>
          {/* Phone Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-slate-950 rounded-b-3xl z-50 border-b-2 border-slate-800" />

          {/* Safe Area Container */}
          <div className="h-full w-full flex flex-col bg-slate-950 relative">
            {/* ─────── TOP BAR ─────── */}
            <div className="flex items-center justify-between px-4 pt-8 pb-4 bg-slate-950 border-b border-slate-900/50 backdrop-blur-sm">
              {/* Slate360 Logo Mark */}
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L20 6V10L12 14L4 10V6L12 2Z" fill="#D4AF37" opacity="0.8" />
                  <path d="M12 10L20 14V18L12 22L4 18V14L12 10Z" fill="#D4AF37" />
                </svg>
                <span className="text-xs font-bold text-slate-300 hidden xs:inline tracking-widest">SLATE360</span>
              </div>

              {/* Search & Actions */}
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-slate-900 rounded-lg transition-colors">
                  <Search size={18} className="text-slate-400" />
                </button>
                <button className="p-2 hover:bg-slate-900 rounded-lg transition-colors relative">
                  <Bell size={18} className="text-slate-400" />
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                </button>
                <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center border border-slate-700">
                  <span className="text-xs font-bold text-amber-500">JD</span>
                </div>
              </div>
            </div>

            {/* ─────── CONTENT AREA ─────── */}
            <div className="flex-1 overflow-y-auto px-3 py-5 pb-24 scroll-smooth space-y-5">
              {/* HOME TAB */}
              {activeTab === "home" && (
                <div className="space-y-5">
                  {/* Search */}
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Find projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Recent & Quick Access */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Quick Access</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: Plus, label: "New Project" },
                        { icon: FolderOpen, label: "Open" },
                        { icon: Files, label: "Files" },
                        { icon: Clock, label: "Recent" },
                      ].map((action, idx) => (
                        <button
                          key={idx}
                          className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg hover:bg-slate-800/80 hover:border-slate-700 transition-all group"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className="p-2 bg-amber-500/20 rounded-lg group-hover:bg-amber-500/30 transition-colors">
                              <action.icon size={16} className="text-amber-500" />
                            </div>
                            <span className="text-xs font-medium text-slate-300">{action.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pinned Projects */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Pinned</h3>
                    <div className="space-y-2">
                      {[1, 2].map((idx) => (
                        <div key={idx} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer group">
                          <div className="flex items-start gap-3">
                            <Star size={14} className="text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-200">Project item</p>
                              <p className="text-xs text-slate-500 mt-0.5">Project · Multiple files</p>
                            </div>
                            <ChevronRight size={14} className="text-slate-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Available Modules */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Explore</h3>
                    <div className="space-y-2">
                      {[
                        { label: "360 Tours" },
                        { label: "Design Studio" },
                        { label: "Content Studio" },
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-amber-500 rounded-full" />
                              <span className="text-sm font-medium text-slate-300">{item.label}</span>
                            </div>
                            <ChevronRight size={14} className="text-slate-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PROJECTS TAB */}
              {activeTab === "projects" && (
                <div className="space-y-5">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Find projects..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Pinned</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2].map((idx) => (
                          <div key={idx} className="aspect-square bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-800/80 transition-colors cursor-pointer">
                            <Star size={16} className="text-amber-500" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {["My Projects", "Team Projects", "Shared", "All Accessible"].map((section, idx) => (
                      <div key={idx}>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">{section}</h3>
                        <div className="space-y-2">
                          {[1, 2].map((item) => (
                            <div key={item} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer group">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-8 h-8 bg-amber-500/15 rounded flex items-center justify-center flex-shrink-0">
                                    <FolderOpen size={14} className="text-amber-500" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-200 truncate">Project</p>
                                    <p className="text-xs text-slate-500">Multiple files</p>
                                  </div>
                                </div>
                                <ChevronRight size={14} className="text-slate-600" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <button className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 rounded-lg text-sm font-semibold text-slate-950 transition-colors">
                      <Plus size={16} />
                      Create New
                    </button>
                  </div>
                </div>
              )}

              {/* FILES TAB */}
              {activeTab === "files" && (
                <div className="space-y-3">
                  {filesContext === "root" && (
                    <>
                      <button
                        onClick={() => setFilesContext("project")}
                        className="w-full flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg hover:bg-slate-800/80 transition-colors"
                      >
                        <Folder size={16} className="text-amber-500" />
                        <span className="text-sm font-medium text-slate-300">Folders</span>
                        <ChevronRight size={14} className="text-slate-600 ml-auto" />
                      </button>

                      <div className="space-y-2 pt-2">
                        {["Projects", "General", "Shared", "Archive"].map((folder, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <Folder size={16} className="text-slate-500" />
                              <span className="text-sm font-medium text-slate-300">{folder}</span>
                            </div>
                            <ChevronRight size={14} className="text-slate-600" />
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {filesContext === "project" && (
                    <>
                      <button
                        onClick={() => setFilesContext("root")}
                        className="flex items-center gap-2 px-1 py-2 text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors"
                      >
                        <ChevronRight size={14} className="rotate-180" />
                        Back
                      </button>

                      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Project Context</p>
                        <p className="text-sm font-semibold text-slate-200 mt-2">Contents</p>
                      </div>

                      <div className="space-y-2 pt-2">
                        {["Documents", "Assets", "References", "Archive"].map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                              <Files size={16} className="text-slate-500" />
                              <span className="text-sm font-medium text-slate-300">{file}</span>
                            </div>
                            <ChevronRight size={14} className="text-slate-600" />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TASKS TAB */}
              {activeTab === "tasks" && (
                <div className="space-y-5">
                  {["My Tasks", "Reviews", "Submissions", "Overdue", "Completed"].map((section, idx) => (
                    <div key={idx}>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">{section}</h3>
                      <div className="space-y-2">
                        {[1, 2].map((task) => (
                          <div key={task} className="flex items-start gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer group">
                            <CheckSquare size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-200">Task item</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300 rounded">Priority</span>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-slate-600" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ACCOUNT TAB */}
              {activeTab === "account" && (
                <div className="space-y-5">
                  {/* Profile Section */}
                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                        <span className="text-sm font-bold text-amber-500">JD</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">User Name</p>
                        <p className="text-xs text-slate-500">user@email.com</p>
                      </div>
                    </div>
                    <button className="w-full py-2.5 px-3 text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors border border-amber-500/50 rounded-lg hover:bg-amber-500/5">
                      Edit Profile
                    </button>
                  </div>

                  {/* Menu Items */}
                  <div className="space-y-2">
                    {[
                      { icon: User, label: "Profile & Account" },
                      { icon: BarChart3, label: "Usage & Billing" },
                      { icon: Download, label: "Downloads" },
                      { icon: Settings, label: "Settings" },
                      { icon: HelpCircle, label: "Support & Help" },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={16} className="text-amber-500" />
                          <span className="text-sm font-medium text-slate-300">{item.label}</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-600" />
                      </div>
                    ))}
                  </div>

                  <button className="w-full py-3 px-3 text-sm font-medium text-slate-400 hover:text-slate-300 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 rounded-lg transition-colors">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
            </div>

            {/* ─────── BOTTOM NAVIGATION ─────── */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-20 bg-slate-950/95 border-t border-slate-900/50 backdrop-blur-sm px-2 safe-area-inset-bottom">
              {[
                { id: "home", icon: Home, label: "Home" },
                { id: "projects", icon: FolderOpen, label: "Projects" },
                { id: "files", icon: Files, label: "Files" },
                { id: "tasks", icon: CheckSquare, label: "Tasks" },
                { id: "account", icon: User, label: "Account" },
              ].map((nav) => (
                <button
                  key={nav.id}
                  onClick={() => setActiveTab(nav.id as Tab)}
                  className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg transition-all text-xs font-medium ${
                    activeTab === nav.id
                      ? "text-amber-500 bg-amber-500/10"
                      : "text-slate-500 hover:text-slate-400 hover:bg-slate-900/50"
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
    </div>
  );
}

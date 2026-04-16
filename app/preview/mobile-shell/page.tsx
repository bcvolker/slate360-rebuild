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
    <div className="min-h-screen bg-slate-900 dark overflow-hidden">
      {/* Mobile Phone Frame Wrapper */}
      <div className="flex items-center justify-center min-h-screen p-4 dark">
        <div className="relative w-full max-w-sm bg-slate-950 rounded-3xl shadow-2xl overflow-hidden border-8 border-slate-800" style={{ aspectRatio: "9/19.5" }}>
          {/* Phone Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-slate-950 rounded-b-3xl z-50 border-b-2 border-slate-700" />

          {/* Safe Area Container */}
          <div className="h-full w-full flex flex-col bg-slate-950 relative">
            {/* ─────── TOP BAR ─────── */}
            <div className="flex items-center justify-between px-4 pt-8 pb-3 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-amber-500 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-950">S</span>
                </div>
                <span className="text-sm font-bold text-white hidden xs:inline">Slate360</span>
              </div>

              {/* Search & Actions */}
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  <Search size={18} className="text-slate-300" />
                </button>
                <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors relative">
                  <Bell size={18} className="text-slate-300" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
                </button>
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-950">JD</span>
                </div>
              </div>
            </div>

            {/* ─────── CONTENT AREA ─────── */}
            <div className="flex-1 overflow-y-auto px-3 py-4 pb-24 scroll-smooth">
              {/* HOME TAB */}
              {activeTab === "home" && (
                <div className="space-y-4">
                  {/* Search Projects */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  {/* Pinned Projects */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Pinned Projects</h3>
                    <div className="space-y-2">
                      {["Downtown Office Tower", "Riverside Park Condos"].map((project, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer">
                          <Star size={16} className="text-amber-500" fill="currentColor" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{project}</p>
                            <p className="text-xs text-slate-400">Active • 12 files</p>
                          </div>
                          <ChevronRight size={16} className="text-slate-500" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: Plus, label: "New Project", color: "from-amber-500 to-amber-600" },
                        { icon: FolderOpen, label: "Open Projects", color: "from-blue-500 to-blue-600" },
                        { icon: Files, label: "Open Files", color: "from-purple-500 to-purple-600" },
                        { icon: Clock, label: "Resume Work", color: "from-emerald-500 to-emerald-600" },
                      ].map((action, idx) => (
                        <button
                          key={idx}
                          className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700/50 transition-all flex flex-col items-center gap-2 group"
                        >
                          <div className={`p-2 bg-gradient-to-br ${action.color} rounded-lg group-hover:scale-110 transition-transform`}>
                            <action.icon size={16} className="text-white" />
                          </div>
                          <span className="text-xs font-medium text-slate-300 text-center">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notifications & Pending */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Pending</h3>
                    <div className="space-y-2">
                      {[
                        { title: "RFI #4521 awaiting response", time: "2 days overdue" },
                        { title: "Submittal review from contractor", time: "In review" },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                          <div className="w-2 h-2 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">{item.title}</p>
                            <p className="text-xs text-slate-400">{item.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Apps & Tools */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Available Apps</h3>
                    <div className="space-y-2">
                      {[
                        { name: "Site Walk", icon: MapPin, color: "bg-orange-500/10 border-orange-500/30" },
                        { name: "Design Studio", icon: Folder, color: "bg-purple-500/10 border-purple-500/30" },
                        { name: "Content Studio", icon: Files, color: "bg-pink-500/10 border-pink-500/30" },
                      ].map((app, idx) => (
                        <div key={idx} className={`flex items-center gap-3 p-3 border rounded-lg ${app.color} cursor-pointer hover:opacity-80 transition-opacity`}>
                          <app.icon size={16} className="text-slate-300" />
                          <span className="text-sm font-medium text-slate-300">{app.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PROJECTS TAB */}
              {activeTab === "projects" && (
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search projects..."
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Pinned</h3>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {["DTC", "RPC"].map((pin, idx) => (
                          <div key={idx} className="flex-shrink-0 w-20 aspect-square bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center">
                            <Star size={16} className="text-amber-500" fill="currentColor" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {["My Projects", "Team Projects", "Shared / External", "All Accessible"].map((section, idx) => (
                      <div key={idx}>
                        <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">{section}</h3>
                        <div className="space-y-2">
                          {[1, 2].map((item) => (
                            <div key={item} className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-8 h-8 bg-amber-500/20 rounded flex items-center justify-center">
                                  <FolderOpen size={14} className="text-amber-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-white truncate">Project {section.split(" ")[0]}</p>
                                  <p className="text-xs text-slate-400">8 files</p>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-slate-500" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <button className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 rounded-lg text-sm font-semibold text-slate-950 transition-colors">
                      <Plus size={16} />
                      Create Project
                    </button>
                  </div>
                </div>
              )}

              {/* FILES TAB */}
              {activeTab === "files" && (
                <div className="space-y-4">
                  {filesContext === "root" && (
                    <>
                      <button
                        onClick={() => setFilesContext("project")}
                        className="w-full flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700/50 transition-colors"
                      >
                        <Folder size={18} className="text-amber-500" />
                        <span className="text-sm font-medium text-white">Projects</span>
                        <ChevronRight size={16} className="text-slate-500 ml-auto" />
                      </button>

                      {["General", "Site Walk", "360 Tours", "Design Studio", "Content Studio", "Shared", "Archive / History"].map((folder, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <Folder size={18} className="text-slate-400" />
                            <span className="text-sm font-medium text-white">{folder}</span>
                          </div>
                          <ChevronRight size={16} className="text-slate-500" />
                        </div>
                      ))}
                    </>
                  )}

                  {filesContext === "project" && (
                    <>
                      <button
                        onClick={() => setFilesContext("root")}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors"
                      >
                        <ChevronRight size={16} className="rotate-180" />
                        Back to Root
                      </button>

                      <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Downtown Office Tower</p>
                        <p className="text-sm font-semibold text-white mt-1">Project Files (24)</p>
                      </div>

                      {["Drawings", "Specifications", "Permits", "Contracts", "Submittals", "RFIs"].map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <Files size={18} className="text-slate-400" />
                            <span className="text-sm font-medium text-white">{file}</span>
                          </div>
                          <ChevronRight size={16} className="text-slate-500" />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* TASKS TAB */}
              {activeTab === "tasks" && (
                <div className="space-y-4">
                  {["My Tasks", "Approvals / Reviews", "Contractor Submissions", "Overdue / At Risk", "Recently Completed"].map((section, idx) => (
                    <div key={idx}>
                      <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">{section}</h3>
                      <div className="space-y-2">
                        {[1, 2].map((task) => (
                          <div key={task} className="flex items-start gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer">
                            <CheckSquare size={18} className="text-slate-400 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">Task item from {section}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300 rounded">Due today</span>
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-slate-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ACCOUNT TAB */}
              {activeTab === "account" && (
                <div className="space-y-4">
                  {/* Profile Section */}
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-slate-950">JD</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">John Doe</p>
                        <p className="text-xs text-slate-400">john.doe@slate360.com</p>
                      </div>
                    </div>
                    <button className="w-full py-2 px-3 text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors border border-amber-500/30 rounded-lg">
                      Edit Profile
                    </button>
                  </div>

                  {/* Menu Items */}
                  {[
                    { icon: User, label: "Profile & Organization" },
                    { icon: BarChart3, label: "Plan & Usage" },
                    { icon: Download, label: "Downloads & Updates" },
                    { icon: Settings, label: "Settings" },
                    { icon: HelpCircle, label: "Help & Support" },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={18} className="text-amber-500" />
                        <span className="text-sm font-medium text-white">{item.label}</span>
                      </div>
                      <ChevronRight size={16} className="text-slate-500" />
                    </div>
                  ))}

                  <button className="w-full py-3 px-3 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700 rounded-lg transition-colors">
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* ─────── BOTTOM NAVIGATION ─────── */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-20 bg-gradient-to-t from-slate-950 to-slate-950/50 border-t border-slate-800 px-2 safe-area-inset-bottom">
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
                  className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-all ${
                    activeTab === nav.id
                      ? "text-amber-500 bg-amber-500/10"
                      : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
                  }`}
                >
                  <nav.icon size={20} />
                  <span className="text-xs font-medium">{nav.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * ==========================================================================
 * WALLED GARDEN DASHBOARD - Slate360
 * ==========================================================================
 * 
 * A production-ready React TypeScript dashboard shell implementing the
 * Dark Glass aesthetic with Industrial Gold accents.
 * 
 * DESIGN SYSTEM RULES FOLLOWED:
 * 1. Dark Glass Aesthetic: Charcoal/zinc surfaces with heavy glassmorphism
 * 2. Industrial Gold (#D4AF37): Primary accent for buttons, active states,
 *    progress bars, hover glows, and highlights
 * 3. No orange or navy colors anywhere
 * 4. Glass effects: backdrop-filter blur(16px), semi-transparent backgrounds
 * 5. Custom CSS properties: --glass-surface, --border-glass, --shadow-glass
 * 
 * ==========================================================================
 */

import * as React from "react";
import { useState } from "react";
import {
  Search,
  Bell,
  Menu,
  X,
  LayoutDashboard,
  Grid3X3,
  Inbox,
  FileCheck,
  Users,
  CreditCard,
  ChevronRight,
  Upload,
  Folder,
  Eye,
  Share2,
  Sparkles,
  Building2,
  MapPin,
  Lock,
  ExternalLink,
  PanelLeftClose,
  FolderOpen,
  File,
  FileText,
  FileImage,
  MoreHorizontal,
  Download,
  Trash2,
  Settings,
  Palette,
  UserPlus,
  Shield,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/* ==========================================================================
   TYPE DEFINITIONS
   TypeScript interfaces for the dashboard data structures
   ========================================================================== */

/** Navigation link item */
interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  isActive?: boolean;
}

/** App in the launcher grid */
interface AppItem {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: "active" | "upgrade";
  storageUsed?: string;
}

/** Mini app for sidebar launcher */
interface MiniApp {
  id: string;
  name: string;
  icon: React.ElementType;
  isActive: boolean;
}

/** Storage breakdown item */
interface StorageItem {
  app: string;
  size: string;
  color: string;
}

/** Deliverable item */
interface Deliverable {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  isDegraded?: boolean;
}

/** SlateDrop folder */
interface SlateDropFolder {
  id: string;
  name: string;
  fileCount: number;
}

/** SlateDrop file for file manager */
interface SlateDropFile {
  id: string;
  name: string;
  type: "folder" | "image" | "document" | "video";
  size?: string;
  modified: string;
  shared?: boolean;
}

/** Enterprise user for seat management */
interface EnterpriseUser {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Builder" | "Viewer";
  assignedApps: string[];
  avatar?: string;
}

/* ==========================================================================
   MOCK DATA
   Static data matching the app-centric model (no legacy tiers)
   ========================================================================== */

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", isActive: true },
  { label: "Apps", icon: Grid3X3, href: "/apps" },
  { label: "SlateDrop", icon: Inbox, href: "/slatedrop" },
  { label: "Deliverables", icon: FileCheck, href: "/deliverables" },
  { label: "Clients", icon: Users, href: "/clients" },
  { label: "Billing", icon: CreditCard, href: "/billing" },
];

const APPS: AppItem[] = [
  {
    id: "site-walk",
    name: "Site Walk",
    description: "Document and track construction progress with GPS-tagged photos",
    icon: MapPin,
    status: "active",
    storageUsed: "4.1 GB",
  },
  {
    id: "360-tours",
    name: "360 Tours",
    description: "Create immersive 3D virtual tours with interactive hotspots",
    icon: Building2,
    status: "active",
    storageUsed: "9.2 GB",
  },
  {
    id: "design-studio",
    name: "Design Studio",
    description: "Professional editing and design tools for construction visuals",
    icon: Sparkles,
    status: "upgrade",
    storageUsed: "5.1 GB",
  },
];

const MINI_APPS: MiniApp[] = [
  { id: "site-walk", name: "Site Walk", icon: MapPin, isActive: true },
  { id: "360-tours", name: "360 Tours", icon: Building2, isActive: true },
  { id: "design-studio", name: "Design Studio", icon: Sparkles, isActive: false },
  { id: "analytics", name: "Analytics", icon: LayoutDashboard, isActive: false },
];

const STORAGE_BREAKDOWN: StorageItem[] = [
  { app: "360 Tours", size: "9.2 GB", color: "bg-primary" },
  { app: "Design Studio", size: "5.1 GB", color: "bg-primary/70" },
  { app: "Site Walk", size: "4.1 GB", color: "bg-primary/40" },
];

const DELIVERABLES: Deliverable[] = [
  {
    id: "1",
    title: "Downtown Tower Virtual Tour",
    thumbnail: "/api/placeholder/320/180",
    views: 1247,
  },
  {
    id: "2",
    title: "Riverside Complex Walkthrough",
    thumbnail: "/api/placeholder/320/180",
    views: 892,
  },
  {
    id: "3",
    title: "Harbor View Progress Report",
    thumbnail: "/api/placeholder/320/180",
    views: 456,
    isDegraded: true, // Downgrade Law: Shows degraded state with watermark
  },
  {
    id: "4",
    title: "Tech Campus Phase 2",
    thumbnail: "/api/placeholder/320/180",
    views: 2103,
  },
];

const SLATEDROP_FOLDERS: SlateDropFolder[] = [
  { id: "1", name: "Downtown Tower Assets", fileCount: 24 },
  { id: "2", name: "Client Presentations", fileCount: 8 },
  { id: "3", name: "Site Photos March", fileCount: 156 },
  { id: "4", name: "Floor Plans v2", fileCount: 12 },
];

const ORG_NAME = "Meridian Construction";

/** Mock data for SlateDrop file manager */
const SLATEDROP_FILES: SlateDropFile[] = [
  { id: "f1", name: "Downtown Tower Assets", type: "folder", modified: "2 hours ago", shared: true },
  { id: "f2", name: "Client Presentations", type: "folder", modified: "Yesterday", shared: true },
  { id: "f3", name: "Site Photos March", type: "folder", modified: "3 days ago" },
  { id: "f4", name: "Floor Plans v2", type: "folder", modified: "1 week ago" },
  { id: "d1", name: "Project_Overview_Q1.pdf", type: "document", size: "2.4 MB", modified: "Today" },
  { id: "d2", name: "Site_Inspection_Report.docx", type: "document", size: "1.8 MB", modified: "Yesterday" },
  { id: "i1", name: "Facade_Render_Final.png", type: "image", size: "8.2 MB", modified: "3 days ago", shared: true },
  { id: "i2", name: "Interior_Progress_001.jpg", type: "image", size: "4.1 MB", modified: "4 days ago" },
  { id: "i3", name: "Lobby_Concept_v3.jpg", type: "image", size: "5.7 MB", modified: "1 week ago" },
];

/** Mock data for enterprise seat management */
const ENTERPRISE_USERS: EnterpriseUser[] = [
  { id: "u1", name: "Sarah Chen", email: "sarah.chen@meridian.com", role: "Admin", assignedApps: ["Site Walk", "360 Tours", "Design Studio"] },
  { id: "u2", name: "Marcus Johnson", email: "m.johnson@meridian.com", role: "Builder", assignedApps: ["Site Walk", "360 Tours"] },
  { id: "u3", name: "Emily Rodriguez", email: "e.rodriguez@meridian.com", role: "Builder", assignedApps: ["360 Tours", "Design Studio"] },
  { id: "u4", name: "David Kim", email: "d.kim@meridian.com", role: "Viewer", assignedApps: ["Site Walk"] },
  { id: "u5", name: "Lisa Thompson", email: "l.thompson@meridian.com", role: "Viewer", assignedApps: ["360 Tours"] },
];

/* ==========================================================================
   CIRCULAR PROGRESS COMPONENT
   Custom SVG-based circular progress ring with liquid-fill animation
   Following Dark Glass rules: Gold stroke color with glow effect
   ========================================================================== */

function CircularProgress({
  value,
  size = 180,
  strokeWidth = 12,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background ring - Glass effect */}
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          className="opacity-30"
        />
        {/* Progress ring - Industrial Gold with glow */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: "drop-shadow(0 0 8px hsl(45 82% 55% / 0.5))",
          }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">18.4</span>
        <span className="text-sm text-muted-foreground">GB used</span>
      </div>
    </div>
  );
}

/* ==========================================================================
   SIDEBAR COMPONENT
   Collapsible left sidebar with:
   - Logo in Industrial Gold
   - Navigation links with hover states
   - App Launcher mini-grid at bottom
   Background uses bg-glass for glassmorphism effect
   ========================================================================== */

function Sidebar({
  isOpen,
  onClose,
  isMobile = false,
}: {
  isOpen: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}) {
  const sidebarContent = (
    <div className="flex h-full flex-col bg-glass border-r border-glass">
      {/* Logo Section - Placeholder for SVG injection */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-glass">
        <div className="flex items-center gap-2">
          {/* [SLATE360_SVG_LOGO_HERE] - Replace this div with your SVG logo component */}
          <div className="h-10 px-3 rounded-lg border-2 border-dashed border-primary/50 bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-mono text-primary whitespace-nowrap">[SLATE360_SVG_LOGO_HERE]</span>
          </div>
        </div>
        {isMobile && onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation Links - Gold active states */}
      <nav className="flex-1 space-y-1 p-4">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              "hover:bg-primary/10 hover:text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              item.isActive
                ? "bg-primary/15 text-primary border-glass-active"
                : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
            {item.isActive && (
              <ChevronRight className="ml-auto h-4 w-4 text-primary" />
            )}
          </a>
        ))}
      </nav>

      {/* App Launcher Mini-Grid - Gold glow on active */}
      <div className="border-t border-glass p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Quick Launch
        </p>
        <div className="grid grid-cols-4 gap-2">
          {MINI_APPS.map((app) => (
            <Tooltip key={app.id}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
                    "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    app.isActive
                      ? "bg-primary/20 text-primary shadow-gold-glow"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <app.icon className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-glass border-glass">
                <p>{app.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return sidebarContent;
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen w-64 transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {sidebarContent}
    </aside>
  );
}

/* ==========================================================================
   HEADER COMPONENT
   Fixed top header with:
   - Hamburger toggle (left)
   - Global search bar (center)
   - Notification bell, upgrade button, user avatar (right)
   Uses subtle glass effect with border-glass
   ========================================================================== */

function Header({
  onMenuClick,
  isSidebarOpen,
}: {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
}) {
  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-30 h-16 bg-glass border-b border-glass transition-all duration-300",
        isSidebarOpen ? "lg:left-64" : "lg:left-0"
      )}
    >
      <div className="flex h-full items-center justify-between px-4 gap-4">
        {/* Left: Home + Menu Toggle */}
        <div className="flex items-center gap-2">
          <a href="/" aria-label="Home" className="shrink-0">
            <img src="/uploads/SLATE 360-Color Reversed Lockup.svg" alt="Slate360" className="h-6 w-auto" />
          </a>
          <Button
            variant="outline"
            size="icon"
            onClick={onMenuClick}
            className="border-border bg-muted/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
          >
            {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        </div>

        {/* Center: Global Search - Glass input style */}
        <div className="flex-1 max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search projects, deliverables, clients..."
              className="w-full pl-10 bg-muted/50 border-glass focus-visible:ring-primary focus-visible:border-primary/50"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Notification Bell with Badge */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-primary/10 hover:text-primary"
              >
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                  3
                </Badge>
                <span className="sr-only">Notifications</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-glass border-glass">
              <p>3 new notifications</p>
            </TooltipContent>
          </Tooltip>

          {/* Upgrade Button - Industrial Gold */}
          <Button className="hidden sm:flex bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold-glow">
            <Sparkles className="mr-2 h-4 w-4" />
            Upgrade
          </Button>

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 border-2 border-primary/30">
                  <AvatarImage src="/api/placeholder/36/36" alt="User" />
                  <AvatarFallback className="bg-primary/20 text-primary">JD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-glass border-glass">
              <DropdownMenuLabel className="text-foreground">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem className="hover:bg-primary/10 hover:text-primary cursor-pointer">
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-primary/10 hover:text-primary cursor-pointer">
                Organization
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-primary/10 hover:text-primary cursor-pointer">
                Billing
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem className="hover:bg-destructive/10 hover:text-destructive cursor-pointer">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

/* ==========================================================================
   APP CARD COMPONENT
   Glass card for each app in the launcher grid with:
   - Hover scale + gold glow effect
   - Status badge (Active in gold, Upgrade in destructive)
   - Launch button with gold accent
   ========================================================================== */

function AppCard({ app }: { app: AppItem }) {
  return (
    <Card className="group relative overflow-hidden bg-glass border-glass shadow-glass transition-all duration-300 hover:scale-[1.02] hover:shadow-glass-hover hover:border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {/* App Icon with gold glow when active */}
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300",
              app.status === "active"
                ? "bg-primary/20 text-primary group-hover:shadow-gold-glow"
                : "bg-muted text-muted-foreground"
            )}
          >
            <app.icon className="h-6 w-6" />
          </div>
          {/* Status Badge - Gold for active, destructive for upgrade */}
          <Badge
            variant={app.status === "active" ? "default" : "destructive"}
            className={cn(
              app.status === "active"
                ? "bg-primary/20 text-primary border-primary/30"
                : "bg-destructive/20 text-destructive border-destructive/30"
            )}
          >
            {app.status === "active" ? "Active" : "Upgrade"}
          </Badge>
        </div>
        <CardTitle className="text-lg text-foreground">{app.name}</CardTitle>
        <CardDescription className="text-muted-foreground line-clamp-2">
          {app.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          className={cn(
            "w-full transition-all duration-200",
            app.status === "active"
              ? "bg-primary text-primary-foreground hover:bg-primary/90 group-hover:shadow-gold-glow"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {app.status === "active" ? (
            <>
              Launch
              <ExternalLink className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Unlock
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ==========================================================================
   STORAGE METER COMPONENT
   Compact glass card with:
   - Linear progress bar in gold
   - Per-app breakdown pills
   - Buy Credits button for additional storage/processing
   ========================================================================== */

function StorageMeter() {
  const totalStorage = 40;
  const usedStorage = 18.4;
  const percentUsed = (usedStorage / totalStorage) * 100;

  return (
    <Card className="bg-glass border-glass shadow-glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-foreground">Storage & Credits</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {usedStorage} GB of {totalStorage} GB used
            </CardDescription>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold-glow">
            <CreditCard className="mr-2 h-4 w-4" />
            Buy Credits
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Linear Progress Bar - Gold */}
        <div className="space-y-1.5">
          <Progress value={percentUsed} className="h-2 bg-muted/30" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(percentUsed)}% used</span>
            <span>{(totalStorage - usedStorage).toFixed(1)} GB available</span>
          </div>
        </div>

        {/* Per-App Breakdown Pills - Compact inline */}
        <div className="flex flex-wrap gap-2">
          {STORAGE_BREAKDOWN.map((item) => (
            <div
              key={item.app}
              className="flex items-center gap-1.5 rounded-full bg-muted/30 px-2.5 py-1 text-xs"
            >
              <div className={cn("h-1.5 w-1.5 rounded-full", item.color)} />
              <span className="text-muted-foreground">{item.app}</span>
              <span className="font-medium text-foreground">{item.size}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ==========================================================================
   DELIVERABLE CARD COMPONENT
   Glass card for deliverables with:
   - Thumbnail, title, view count
   - Share Portal Link button
   - Degraded state with watermark overlay (Downgrade Law)
   ========================================================================== */

function DeliverableCard({ deliverable }: { deliverable: Deliverable }) {
  return (
    <Card
      className={cn(
        "group relative min-w-[280px] overflow-hidden bg-glass border-glass shadow-glass transition-all duration-300",
        "hover:shadow-glass-hover hover:border-primary/30",
        deliverable.isDegraded && "opacity-80"
      )}
    >
      {/* Thumbnail with optional degraded watermark */}
      <div className="relative aspect-video bg-muted/50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <FileCheck className="h-12 w-12 text-primary/30" />
        </div>
        
        {/* Downgrade Law: Degraded state watermark */}
        {deliverable.isDegraded && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center">
            <Lock className="h-8 w-8 text-muted-foreground mb-2" />
            <Badge variant="destructive" className="bg-destructive/80">
              Upgrade to Access
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-1 mb-2">
          {deliverable.title}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span>{deliverable.views.toLocaleString()} views</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={deliverable.isDegraded}
            className={cn(
              "text-primary hover:bg-primary/10",
              deliverable.isDegraded && "opacity-50"
            )}
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ==========================================================================
   SLATEDROP PANEL COMPONENT
   Vertical list of recent folders with upload buttons
   Glass styling with gold accents
   ========================================================================== */

function SlateDropPanel() {
  return (
    <Card className="bg-glass border-glass shadow-glass h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-foreground">SlateDrop</CardTitle>
          <Badge variant="outline" className="border-primary/30 text-primary">
            Quick Access
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {SLATEDROP_FOLDERS.map((folder) => (
          <div
            key={folder.id}
            className="group flex items-center justify-between rounded-lg p-2.5 transition-all duration-200 hover:bg-primary/10 border border-transparent hover:border-primary/20"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 group-hover:bg-primary/20 transition-colors">
                <Folder className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground line-clamp-1">
                  {folder.name}
                </p>
                <p className="text-xs text-muted-foreground">{folder.fileCount} files</p>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20 hover:text-primary"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-glass border-glass">
                <p>Upload to folder</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ))}
        
        {/* New Folder Button */}
        <Button
          variant="outline"
          className="w-full mt-3 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
        >
          <Folder className="mr-2 h-4 w-4" />
          New Folder
        </Button>
      </CardContent>
    </Card>
  );
}

/* ==========================================================================
   SLATEDROP FILE MANAGER COMPONENT
   Full-featured file manager like Dropbox with:
   - Breadcrumb navigation
   - Folder grid view
   - File list view
   - Share & Permissions on hover
   ========================================================================== */

function SlateDropFileManager() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const getFileIcon = (type: SlateDropFile["type"]) => {
    switch (type) {
      case "folder":
        return FolderOpen;
      case "image":
        return FileImage;
      case "document":
        return FileText;
      default:
        return File;
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const folders = SLATEDROP_FILES.filter((f) => f.type === "folder");
  const files = SLATEDROP_FILES.filter((f) => f.type !== "folder");

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">SlateDrop File Manager</h2>
          <p className="text-muted-foreground">Manage and share your construction assets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-border hover:border-primary hover:text-primary">
            <FolderOpen className="mr-2 h-4 w-4" />
            New Folder
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Breadcrumb Trail */}
      <Card className="bg-glass border-glass">
        <CardContent className="py-3">
          <nav className="flex items-center gap-2 text-sm">
            <button className="text-primary hover:underline font-medium">SlateDrop</button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <button className="text-primary hover:underline">Projects</button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">Downtown Tower</span>
          </nav>
        </CardContent>
      </Card>

      {/* Folders Grid */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Folders</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {folders.map((folder) => {
            const Icon = getFileIcon(folder.type);
            const isHovered = hoveredItem === folder.id;
            
            return (
              <Card
                key={folder.id}
                className={cn(
                  "group relative bg-glass border-glass cursor-pointer transition-all duration-200",
                  "hover:shadow-glass-hover hover:border-primary/30",
                  selectedItems.includes(folder.id) && "border-primary bg-primary/5"
                )}
                onMouseEnter={() => setHoveredItem(folder.id)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => toggleSelection(folder.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    {folder.shared && (
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                        Shared
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium text-foreground line-clamp-1">{folder.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{folder.modified}</p>
                  
                  {/* Share & Permissions Button - appears on hover */}
                  <div
                    className={cn(
                      "absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-background/90 to-transparent transition-opacity duration-200",
                      isHovered ? "opacity-100" : "opacity-0"
                    )}
                  >
                    <Button
                      size="sm"
                      className="w-full bg-primary/90 text-primary-foreground hover:bg-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Share2 className="mr-2 h-3 w-3" />
                      Share & Permissions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Files List */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Files</h3>
        <Card className="bg-glass border-glass overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedItems.length === files.length && files.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedItems(files.map(f => f.id));
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="text-muted-foreground hidden sm:table-cell">Size</TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">Modified</TableHead>
                <TableHead className="text-muted-foreground w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => {
                const Icon = getFileIcon(file.type);
                const isSelected = selectedItems.includes(file.id);
                
                return (
                  <TableRow
                    key={file.id}
                    className={cn(
                      "group border-border cursor-pointer transition-colors",
                      "hover:bg-primary/5",
                      isSelected && "bg-primary/10"
                    )}
                    onMouseEnter={() => setHoveredItem(file.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(file.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-muted/50 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{file.name}</p>
                          {file.shared && (
                            <span className="text-xs text-primary">Shared</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {file.size}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {file.modified}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary">
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-glass border-glass">Share</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary">
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-glass border-glass">Download</TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-glass border-glass">
                            <DropdownMenuItem className="hover:bg-primary/10 hover:text-primary cursor-pointer">
                              <Share2 className="mr-2 h-4 w-4" />
                              Share & Permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hover:bg-primary/10 hover:text-primary cursor-pointer">
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem className="hover:bg-destructive/10 text-destructive cursor-pointer">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}

/* ==========================================================================
   ENTERPRISE SETTINGS COMPONENT
   Enterprise management panel with:
   - Bulk Seat Management table (Name, Role, Assigned Apps)
   - Custom Branding card with hex color inputs
   ========================================================================== */

function EnterpriseSettings() {
  const [brandColors, setBrandColors] = useState({
    primary: "#D4AF37",
    secondary: "#1a1a1f",
    accent: "#2a2a2f",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Enterprise Settings</h2>
        <p className="text-muted-foreground">Manage your organization&apos;s seats and branding</p>
      </div>

      {/* Bulk Seat Management */}
      <Card className="bg-glass border-glass shadow-glass">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Bulk Seat Management
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage user roles and app access across your organization
              </CardDescription>
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Employee Name</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Role</TableHead>
                  <TableHead className="text-muted-foreground">Assigned Apps</TableHead>
                  <TableHead className="text-muted-foreground w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ENTERPRISE_USERS.map((user) => (
                  <TableRow key={user.id} className="border-border hover:bg-primary/5">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {user.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Select defaultValue={user.role}>
                        <SelectTrigger className="w-28 h-8 bg-muted/30 border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-glass border-glass">
                          <SelectItem value="Admin" className="hover:bg-primary/10">
                            <div className="flex items-center gap-2">
                              <Shield className="h-3 w-3 text-primary" />
                              Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="Builder" className="hover:bg-primary/10">Builder</SelectItem>
                          <SelectItem value="Viewer" className="hover:bg-primary/10">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.assignedApps.map((app) => (
                          <Badge
                            key={app}
                            variant="outline"
                            className="text-xs border-border text-muted-foreground"
                          >
                            {app}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-glass border-glass">
                          <DropdownMenuItem className="hover:bg-primary/10 hover:text-primary cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            Edit Permissions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border" />
                          <DropdownMenuItem className="hover:bg-destructive/10 text-destructive cursor-pointer">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Custom Branding */}
      <Card className="bg-glass border-glass shadow-glass">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Custom Branding
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Customize your organization&apos;s visual identity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="primary-color" className="text-foreground">Primary Color</Label>
              <div className="flex items-center gap-2">
                <div
                  className="h-10 w-10 rounded-lg border border-border shadow-sm"
                  style={{ backgroundColor: brandColors.primary }}
                />
                <Input
                  id="primary-color"
                  type="text"
                  value={brandColors.primary}
                  onChange={(e) => setBrandColors({ ...brandColors, primary: e.target.value })}
                  className="font-mono text-sm bg-muted/30 border-border"
                  placeholder="#D4AF37"
                />
              </div>
            </div>

            {/* Secondary Color */}
            <div className="space-y-2">
              <Label htmlFor="secondary-color" className="text-foreground">Secondary Color</Label>
              <div className="flex items-center gap-2">
                <div
                  className="h-10 w-10 rounded-lg border border-border shadow-sm"
                  style={{ backgroundColor: brandColors.secondary }}
                />
                <Input
                  id="secondary-color"
                  type="text"
                  value={brandColors.secondary}
                  onChange={(e) => setBrandColors({ ...brandColors, secondary: e.target.value })}
                  className="font-mono text-sm bg-muted/30 border-border"
                  placeholder="#1a1a1f"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <Label htmlFor="accent-color" className="text-foreground">Accent Color</Label>
              <div className="flex items-center gap-2">
                <div
                  className="h-10 w-10 rounded-lg border border-border shadow-sm"
                  style={{ backgroundColor: brandColors.accent }}
                />
                <Input
                  id="accent-color"
                  type="text"
                  value={brandColors.accent}
                  onChange={(e) => setBrandColors({ ...brandColors, accent: e.target.value })}
                  className="font-mono text-sm bg-muted/30 border-border"
                  placeholder="#2a2a2f"
                />
              </div>
            </div>
          </div>

          {/* Preview and Save */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Changes will apply to all client-facing portals and deliverables.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="border-border hover:border-primary hover:text-primary">
                Reset to Default
              </Button>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save Branding
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ==========================================================================
   DASHBOARD CONTENT COMPONENT
   The original dashboard content (apps, deliverables, etc.)
   ========================================================================== */

function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Hero Welcome Header - Industrial Gold accent */}
      <section className="space-y-2">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
          Good morning,{" "}
          <span className="text-primary">{ORG_NAME}</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Here&apos;s what&apos;s happening across your projects today.
        </p>
      </section>

      {/* App Launcher Grid - 3-column responsive */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Your Apps</h2>
          <Button variant="ghost" className="text-primary hover:bg-primary/10">
            View All
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {APPS.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </section>

      {/* Two Column Layout: Deliverables + SlateDrop */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {/* Recent Deliverables - Horizontal scroll */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                Recent Deliverables
              </h2>
              <Button variant="ghost" className="text-primary hover:bg-primary/10">
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted">
              {DELIVERABLES.map((deliverable) => (
                <DeliverableCard key={deliverable.id} deliverable={deliverable} />
              ))}
            </div>
          </section>
        </div>

        {/* SlateDrop Quick Access Panel */}
        <aside className="hidden lg:block">
          <SlateDropPanel />
        </aside>
      </div>

      {/* Mobile SlateDrop Panel */}
      <div className="lg:hidden">
        <SlateDropPanel />
      </div>

      {/* Storage Meter - Low priority, at bottom */}
      <StorageMeter />
    </div>
  );
}

/* ==========================================================================
   MAIN DASHBOARD COMPONENT
   Orchestrates all sections with:
   - Responsive layout (sidebar collapses to sheet on mobile)
   - Tabbed interface for Dashboard, SlateDrop, Enterprise Settings
   - Proper spacing and glass card styling throughout
   ========================================================================== */

export default function WalledGardenDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <TooltipProvider>
      {/* Force dark mode class on the root */}
      <div className="dark min-h-screen bg-background">
        {/* Desktop Sidebar — hidden below lg */}
        <div className="hidden lg:block">
          <Sidebar isOpen={sidebarOpen} />
        </div>

        {/* Mobile Sidebar — Sheet drawer, only below lg */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent
            side="left"
            className="w-64 p-0 bg-zinc-950 border-zinc-800 lg:hidden [&>button]:text-white [&>button]:opacity-100"
          >
            <Sidebar isOpen isMobile onClose={() => setMobileSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Header */}
        <Header
          isSidebarOpen={sidebarOpen}
          onMenuClick={() => {
            /* Desktop toggles the persistent sidebar; mobile opens the Sheet */
            if (typeof window !== "undefined" && window.innerWidth >= 1024) {
              setSidebarOpen(!sidebarOpen);
            } else {
              setMobileSidebarOpen(true);
            }
          }}
        />

        {/* Main Content Area - shifts right when sidebar is open */}
        <main
          className={cn(
            "pt-16 transition-all duration-300",
            sidebarOpen ? "lg:pl-64" : "lg:pl-0"
          )}
        >
          <div className="p-4 lg:p-6">
            {/* Tabbed Interface for Walled Garden sections */}
            <Tabs defaultValue="dashboard" className="space-y-6">
              <TabsList className="bg-glass border border-glass h-auto p-1 flex-wrap">
                <TabsTrigger
                  value="dashboard"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger
                  value="slatedrop"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
                >
                  <Inbox className="mr-2 h-4 w-4" />
                  SlateDrop
                </TabsTrigger>
                <TabsTrigger
                  value="enterprise"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Enterprise Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="mt-6">
                <DashboardContent />
              </TabsContent>

              <TabsContent value="slatedrop" className="mt-6">
                <SlateDropFileManager />
              </TabsContent>

              <TabsContent value="enterprise" className="mt-6">
                <EnterpriseSettings />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function AppTopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      {/* Breadcrumbs / page title will be injected here via context or slot */}
      <div className="flex-1" />
      {/* Right-side actions (user menu, notifications) will go here */}
    </header>
  );
}

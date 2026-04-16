import Link from "next/link";
import { Bell, ChevronRight, FolderOpen, Home, LogOut } from "lucide-react";

type SlateDropTopBarProps = {
  embedded: boolean;
  user: { name: string; email: string };
  userMenuOpen: boolean;
  onToggleMobileSidebar: () => void;
  onToggleUserMenu: () => void;
  onCloseUserMenu: () => void;
  onSignOut: () => void;
};

export default function SlateDropTopBar({
  embedded,
  user,
  userMenuOpen,
  onToggleMobileSidebar,
  onToggleUserMenu,
  onCloseUserMenu,
  onSignOut,
}: SlateDropTopBarProps) {
  if (embedded) return null;

  return (
    <header className="shrink-0 bg-zinc-950 border-b border-zinc-800 z-30">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <img src="/uploads/SLATE 360-Color Reversed Lockup.svg" alt="Slate360" className="h-6 w-auto" />
          </Link>
          <div className="hidden sm:flex items-center text-xs text-zinc-500">
            <ChevronRight size={12} />
            <span className="ml-1 font-semibold text-zinc-300">SlateDrop</span>
          </div>

          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-800"
          >
            <FolderOpen size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            <Home size={13} /> <span className="hidden sm:inline">Command Center</span>
          </Link>

          <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-800">
            <Bell size={16} />
          </button>

          <div className="relative">
            <button
              onClick={onToggleUserMenu}
              className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white text-[10px] font-bold"
            >
              {user.name.charAt(0).toUpperCase()}
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={onCloseUserMenu} />
                <div className="absolute right-0 top-10 w-52 bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <p className="text-sm font-semibold text-zinc-100">{user.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={onSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/30"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
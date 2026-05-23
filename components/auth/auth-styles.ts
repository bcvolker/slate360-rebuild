/** Shared Graphite Matrix auth surface classes — single source for login/signup. */

export const AUTH_CANVAS =
  "min-h-screen bg-[#0B0F15] flex flex-col justify-center items-center px-4";

export const AUTH_CARD =
  "w-full max-w-md bg-slate-900/40 backdrop-blur-2xl border border-white/[0.05] rounded-xl p-8 shadow-2xl";

export const AUTH_INPUT =
  "w-full h-11 px-3.5 bg-slate-900/60 border border-white/[0.07] rounded-xl text-white font-normal placeholder-slate-500 focus:outline-none focus:border-[#00E699]/60 focus:ring-1 focus:ring-[#00E699]/60 transition-all text-sm";

export const AUTH_SUBMIT =
  "w-full h-11 flex items-center justify-center gap-2 bg-[#00E699] text-[#0B0F15] font-semibold text-sm tracking-tight rounded-xl shadow-lg transition-all active:scale-[0.985] hover:bg-[#00CC88] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

export const AUTH_LABEL =
  "mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#A3AED0]";

export const AUTH_ERROR =
  "rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300";

export const AUTH_OAUTH =
  "w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-white/[0.07] bg-slate-900/60 px-4 text-sm font-medium text-[#F8FAFC] transition-colors hover:border-[#00E699]/40 hover:bg-slate-900/80 disabled:opacity-50";

export const AUTH_LINK = "font-semibold text-[#00E699] hover:text-[#00CC88] transition-colors";

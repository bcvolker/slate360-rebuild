import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowRight, Smartphone, Compass, PenTool, Video, CheckCircle2 } from "lucide-react";

export default async function MarketingHomepageV2() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-[#0B0F15] text-slate-200 selection:bg-amber-500/30 font-sans overflow-x-hidden">
      {/* Dynamic Nav using the correct brand logo */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B0F15]/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              {/* Marketing Nav Header uses the full Wordmark Logo */}
              <img src="/logo.svg?v=cobalt-2026-04-19" alt="Slate360 Logo" className="h-8 w-auto object-contain" />
            </Link>
            
            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <Link href="/dashboard" className="text-sm font-semibold text-slate-200 hover:text-foreground transition-colors">
                  Go to Command Center
                </Link>
              ) : (
                <Link href="/login" className="text-sm font-semibold text-slate-200 hover:text-foreground transition-colors">
                  Sign In
                </Link>
              )}
            </div>
        </div>
      </nav>

      <main>
        {/* HERO SECTION */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/10 rounded-full blur-[120px] opacity-50 pointer-events-none" />
          
          <div className="container mx-auto px-6 relative z-10 text-center max-w-5xl">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 text-foreground">
              The real-time interactive bridge between the field and the office
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              Use your phone or 360 camera to capture site conditions while you walk your project, add comments as you go, and automatically preserve a time-stamped, geolocated record. Site Walk turns that into punch lists, reports, or even proposals with your branding. Then share your deliverables with clients and project stakeholders - within minutes. Free your phone from thousands of project photos that lose meaning over time.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isLoggedIn ? (
                <Link 
                  href="/dashboard"
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:-translate-y-1 flex items-center gap-2"
                >
                  Enter Workspace <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link 
                    href="/signup"
                    className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:-translate-y-1 w-full sm:w-auto"
                  >
                    Start Free Trial
                  </Link>
                  <Link 
                    href="/login"
                    className="px-8 py-4 bg-[#151A23] border border-white/10 hover:bg-white/5 text-foreground font-medium rounded-xl transition-all w-full sm:w-auto"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* VALUE PROPS (Why Slate360 changes the workflow) */}
        <section className="py-24 bg-[#0B0F15] border-t border-white/5 relative z-10">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                Why Slate360 changes the workflow
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Block 1 */}
              <div className="p-8 bg-[#151A23] rounded-3xl border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full group-hover:bg-amber-500/10 transition-colors" />
                <div className="w-14 h-14 bg-[#0B0F15] rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/5">
                  <CheckCircle2 className="w-7 h-7 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4">Stop losing project meaning</h3>
                <p className="text-slate-400 leading-relaxed">
                  Photos, notes, and documents are only valuable if they stay tied to the project context that explains them.
                </p>
              </div>

              {/* Block 2 */}
              <div className="p-8 bg-[#151A23] rounded-3xl border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#94A3B8]/5 rounded-bl-full group-hover:bg-[#94A3B8]/10 transition-colors" />
                <div className="w-14 h-14 bg-[#0B0F15] rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/5">
                  <PenTool className="w-7 h-7 text-[#94A3B8]" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4">Create polished outputs faster</h3>
                <p className="text-slate-400 leading-relaxed">
                  Slate360 helps teams turn site documentation into professional, branded deliverables in minutes instead of spending hours rebuilding the story later.
                </p>
              </div>

              {/* Block 3 */}
              <div className="p-8 bg-[#151A23] rounded-3xl border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full group-hover:bg-amber-500/10 transition-colors" />
                <div className="w-14 h-14 bg-[#0B0F15] rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/5">
                  <Smartphone className="w-7 h-7 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4">Keep the field and office aligned</h3>
                <p className="text-slate-400 leading-relaxed">
                  Make it easier for the people walking the project and the people reviewing it in real-time to work from the same current, contextualized information.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ECOSYSTEM / APPS SECTION */}
        <section className="py-24 bg-[#151A23] border-y border-white/5">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                One platform. Multiple interactive workflows.
              </h2>
              <p className="text-lg text-slate-400">
                Slate360 is built as an ecosystem of connected apps that share projects, files, permissions, and deliverables. Start with Site Walk, then expand into other capabilities as your workflows grow — without losing continuity or context.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Site Walk App Card */}
              <div className="flex gap-6 p-6 md:p-8 bg-[#0B0F15] rounded-[2rem] border border-white/5 group hover:border-amber-500/30 transition-all cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-[#151A23] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                  <Smartphone className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Site Walk</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Collect imagery, document your observations, and quickly create deliverables.
                  </p>
                </div>
              </div>

              {/* 360 Tours App Card */}
              <div className="flex gap-6 p-6 md:p-8 bg-[#0B0F15] rounded-[2rem] border border-white/5 group hover:border-[#94A3B8]/30 transition-all cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-[#151A23] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                  <Compass className="w-8 h-8 text-[#94A3B8]" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">360 Tours</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Create immersive 360 experiences for your clients and project stakeholders.
                  </p>
                </div>
              </div>

              {/* Design Studio App Card */}
              <div className="flex gap-6 p-6 md:p-8 bg-[#0B0F15] rounded-[2rem] border border-white/5 group hover:border-white/20 transition-all cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-[#151A23] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                  <PenTool className="w-8 h-8 text-slate-300" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Design Studio</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Conduct plan reviews, generate 3D models, and design in 2D and 3D workspaces.
                  </p>
                </div>
              </div>

              {/* Content Studio App Card */}
              <div className="flex gap-6 p-6 md:p-8 bg-[#0B0F15] rounded-[2rem] border border-white/5 group hover:border-slate-500/30 transition-all cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-[#151A23] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                  <Video className="w-8 h-8 text-slate-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Content Studio</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Edit standard and 360 video and create high-quality branded videos for your clients and marketing needs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      {/* Simple Footer */}
      <footer className="bg-[#0B0F15] py-12 border-t border-white/5">
        <div className="container mx-auto px-6 text-center">
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} Slate360. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
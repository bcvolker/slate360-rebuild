import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function PreviewHub() {
  return (
    <div className="min-h-screen bg-background dark flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-2">Slate360 Preview Hub</h1>
          <p className="text-sm text-muted-foreground">Design previews and component demonstrations</p>
        </div>

        {/* Preview Cards */}
        <div className="grid grid-cols-1 gap-4">
          {/* Mobile Shell Preview */}
          <Link href="/preview/mobile-shell">
            <div className="p-6 bg-card/60 border border-border rounded-2xl hover:bg-card hover:border-primary/30 transition-all cursor-pointer group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1">Mobile Shell</h2>
                  <p className="text-sm text-muted-foreground">Slate360 mobile app interface preview</p>
                </div>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <ChevronRight className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Footer Info */}
        <div className="mt-12 p-4 bg-card/30 border border-border/50 rounded-2xl">
          <p className="text-xs text-muted-foreground">Preview-only routes. No production data or analytics.</p>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { SpatialWalkthroughIndex } from "@/components/spatial-walkthrough/SpatialWalkthroughIndex";
import { LIBRARY_KINDS, parseLibraryKind, type LibraryKind } from "@/lib/product-shell/library-kinds";

const KIND_COPY: Record<LibraryKind, { title: string; href: string; body: string }> = {
  all: { title: "Library", href: "/projects", body: "Every deliverable type, still filed under its project." },
  walkthrough: { title: "Walkthroughs", href: "/spatial-walkthrough", body: "Published spatial walks clients can look through." },
  twin: { title: "Digital Twins", href: "/digital-twins", body: "Measured reconstructions from capture." },
  "site-walk": { title: "Site Walks", href: "/site-walks", body: "Photo, note, and plan walks." },
  thermal: { title: "Thermal", href: "/thermal-studio", body: "Infrared review stays on its own studio." },
  tour: { title: "360 Tours", href: "/tours", body: "Still panoramas assembled as a tour." },
};

export function LibraryHub({ kind, canAuthor }: { kind?: string | null; canAuthor: boolean }) {
  const active = parseLibraryKind(kind);
  if (active === "walkthrough") {
    return <SpatialWalkthroughIndex canAuthor={canAuthor} />;
  }
  const copy = KIND_COPY[active];
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
      <h1 className="mb-6 text-2xl font-semibold text-white">Library</h1>
      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Library types">
        {LIBRARY_KINDS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="inline-flex h-11 items-center border border-white/10 px-3 text-sm"
            aria-current={item.id === active ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <section className="max-w-xl">
        <h2 className="text-lg text-white">{copy.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--graphite-text-body)]">{copy.body}</p>
        <Link href={copy.href} className="mt-5 inline-flex h-12 items-center border border-white/20 px-4 text-sm">
          Open {copy.title}
        </Link>
      </section>
    </div>
  );
}

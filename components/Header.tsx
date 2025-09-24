'use client';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

const LINKS = [
  { href: '/contact', label: 'Contact' },
  { href: '/about', label: 'About' },
  { href: '/subscribe', label: 'Subscribe' },
  { href: '/login', label: 'Login' },
];

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'project-hub', label: 'Project Hub' },
  { id: 'bim-studio', label: 'BIM Studio' },
  { id: 'tours', label: '360 Tours' },
  { id: 'content', label: 'Content' },
  { id: 'geospatial', label: 'Geospatial' },
  { id: 'insights', label: 'Insights' },
  { id: 'vr', label: 'VR/AR' },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Link href="/" className="flex items-center gap-3">
            <Image src="/slate360logoforwebsite.png" alt="Slate360" width={120} height={40} priority />
          </Link>
        </motion.div>
        <nav className="hidden items-center gap-4 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-slate-700 hover:text-sky-600 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      {/* Section nav row */}
      <div className="border-t bg-white">
        <nav className="mx-auto hidden w-full max-w-7xl items-center gap-3 overflow-x-auto px-4 py-2 md:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-xs uppercase tracking-wide text-slate-600 hover:text-sky-600 whitespace-nowrap"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
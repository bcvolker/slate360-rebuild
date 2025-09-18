'use client';
import { useState, useEffect } from 'react';
import clsx from 'clsx';

const navItems = [
  { name: 'BIM Studio', id: 'bim-studio' },
  { name: 'Project Hub', id: 'project-hub' },
  { name: '360 Tour Builder', id: 'tour-builder' },
  { name: 'Content Creation', id: 'content-creation' },
  { name: 'Geospatial', id: 'geospatial' },
  { name: 'Reports & Analytics', id: 'reports' },
  { name: 'VR/AR Lab', id: 'vr-ar-lab' },
];

export default function Header() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-50% 0px -50% 0px' }
    );
    navItems.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    const hero = document.getElementById('hero');
    if (hero) observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-end items-center p-4 animate-fly-in">
      <nav className="flex items-center space-x-4 md:space-x-6 bg-black/20 backdrop-blur-md p-3 rounded-lg">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={clsx(
              'px-3 py-1 text-sm md:text-base rounded-md transition-all duration-300',
              activeSection === item.id ? 'bg-[hsl(var(--color-brand-blue))] text-white' : 'text-gray-300 hover:text-white'
            )}
          >
            {item.name}
          </a>
        ))}
      </nav>
    </header>
  );
}

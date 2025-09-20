
"use client";
import { useState, useEffect, useRef } from 'react';

export default function PageClient() {
  console.log("DEBUG: Rendering app/PageClient.tsx at", new Date().toISOString());
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0.5 }
    );
    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-red-500 flex items-center justify-center">
      <h1 className="text-white text-4xl">DEBUG: Slate360 - Latest Build</h1>
    </div>
  );
}

'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { tileData } from '@/lib/tile-data';

export default function Navbar(){
  const [active, setActive] = useState<string>('hero');
  const obs = useRef<IntersectionObserver|null>(null);

  useEffect(()=>{
    obs.current = new IntersectionObserver((entries)=>{
      const top = entries.find(e=>e.isIntersecting)?.target as HTMLElement;
      if(top?.id) setActive(top.id);
    }, { threshold: 0.55, rootMargin: '0px 0px -10% 0px' });

    const secs = document.querySelectorAll('section[data-tile]');
    secs.forEach(s=>obs.current?.observe(s));
    return ()=>secs.forEach(s=>obs.current?.unobserve(s));
  },[]);

  const staticLinks = [
    {id:"about", title:"About", href:"/about"},
    {id:"contact", title:"Contact", href:"/contact"},
    {id:"pricing", title:"Pricing", href:"/pricing"},
    {id:"login", title:"Login", href:"/login"},
  ];

  return (
    <>
      {/* Top blue header with static links */}
      <header className="fixed top-0 inset-x-0 z-40 h-12 bg-brand-blue/90 header-blur header-border flex items-center justify-end">
        <nav className="w-full max-w-7xl px-4 md:px-6 flex items-center justify-end">
          <ul className="hidden md:flex items-center gap-6 text-sm">
            {staticLinks.map(l=>(
              <li key={l.id}>
                <Link href={l.href} className="text-copper hover:text-copper/80">{l.title}</Link>
              </li>
            ))}
          </ul>
          <MobileMenu active={active} items={tileData} extra={staticLinks}/>
        </nav>
      </header>

      {/* Tile navigation bar below header */}
      <nav className="fixed top-12 inset-x-0 z-30 h-10 bg-white border-b border-slate-200 flex items-center justify-center">
        <div className="w-full max-w-7xl px-4 md:px-6 flex items-center justify-center">
          <ul className="hidden md:flex items-center gap-8 text-sm">
            {tileData.map(t=>(
              <li key={t.id}>
                <a
                  href={`#${t.id}`}
                  className={`transition relative after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-copper after:transition-all ${
                    active===t.id ? 'text-copper after:w-full font-medium' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}

function MobileMenu({active, items, extra}:{active:string; items:{id:string; title:string;}[]; extra:{id:string;title:string;href:string;}[];}){
  const [open,setOpen]=useState(false);
  return (
    <div className="ml-auto md:hidden">
      <button onClick={()=>setOpen(!open)} className="text-white">
        <svg className="h-6 w-6" viewBox="0 0 24 24" stroke="currentColor" fill="none">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>
      {open && (
        <ul className="absolute top-12 left-0 right-0 bg-brand-blue/95 border-t border-white/10 py-3 space-y-2 z-50">
          {items.map(t=>(
            <li key={t.id} className="text-center">
              <a href={`#${t.id}`} onClick={()=>setOpen(false)}
                className={`block py-2 ${active===t.id?'text-copper':'text-white/90 hover:text-white'}`}>
                {t.title}
              </a>
            </li>
          ))}
          {extra.map(l=>(
            <li key={l.id} className="text-center">
              <Link href={l.href} onClick={()=>setOpen(false)} className="block py-2 text-copper hover:text-copper/80">
                {l.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

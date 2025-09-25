import Image from 'next/image';
import Link from 'next/link';
import Navbar from './Navbar';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[70px] bg-slate-50/90 backdrop-blur border-b border-slate-200">
      <div className="relative mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" aria-label="Go to Homepage" className="absolute top-1/2 left-6 -translate-y-1/2">
          <div className="relative h-[56px] w-[200px]">
            <Image
              src="/slate360logoforwebsite.png"
              alt="Slate360 Logo"
              fill
              priority
              sizes="200px"
              className="object-contain drop-shadow-md"
            />
          </div>
        </Link>
        <Navbar />
      </div>
    </header>
  );
}

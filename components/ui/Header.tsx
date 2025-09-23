import Link from 'next/link';
export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4 bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
      <div className="mx-auto max-w-7xl">
        <Link href="/" aria-label="Go to Homepage">
          <img
            src="/slate360-logo.png"
            alt="Slate360 Logo"
            style={{
              width: '180px',
              height: '45px',
              display: 'block',
              objectFit: 'contain',
              background: 'white',
              borderRadius: '8px',
            }}
          />
        </Link>
      </div>
    </header>
  );
}
import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4 bg-transparent">
      <div className="mx-auto max-w-7xl">
        <Link href="/" aria-label="Go to Homepage">
          {/*
            This wrapper div creates a stable "bounding box" for the logo.
            By setting an explicit width, height, and position, we protect the
            image from external CSS rules that might be collapsing its dimensions or hiding it.
          */}
          <div style={{ width: '180px', height: '45px', position: 'relative' }}>
            <Image
              src="https://via.placeholder.com/180x45.png?text=Test+Logo"
              alt="Test Logo"
              fill
              priority
              sizes="180px"
              className="logo"
              style={{
                objectFit: 'contain',
                display: 'block',
                visibility: 'visible',
                opacity: 1,
              }}
            />
          </div>
        </Link>
      </div>
    </header>
  );
}
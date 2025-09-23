import Link from 'next/link';
export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4 bg-transparent">
      <div className="mx-auto max-w-7xl">
        <Link href="/" aria-label="Go to Homepage">
          <img
            src="https://via.placeholder.com/180x45.png?text=Test+Logo"
            alt="Test Logo"
            style={{
              width: '180px',
              height: '45px',
              display: 'block',
              visibility: 'visible',
              opacity: 1,
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
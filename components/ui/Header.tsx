import Link from 'next/link';
export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4 bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
      <div className="mx-auto max-w-7xl">
        <Link href="/" aria-label="Go to Homepage">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg"
              alt="React Logo Test"
              style={{
                height: '45px',
                width: '180px',
                objectFit: 'contain',
                background: 'yellow',
              }}
            />
        </Link>
      </div>
    </header>
  );
}
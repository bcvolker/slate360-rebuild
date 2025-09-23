export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4 bg-transparent">
      <div className="mx-auto max-w-7xl">
        <a href="/" aria-label="Go to Homepage">
          <img
            src="/slate360-logo.png"
            alt="Slate360 Logo"
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
        </a>
      </div>
    </header>
  );
}
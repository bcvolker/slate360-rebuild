import Link from 'next/link';
import Image from 'next/image';

const links = [
  { href: "/about", label: "About" },
  { href: "/subscribe", label: "Subscribe" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "Login" },
];

export default function Header() {
  return (
    <header style={{ width: '100%', background: '#fff', borderBottom: '1px solid #eee', boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)', position: 'sticky', top: 0, zIndex: 100 }}>
      <nav style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 88, padding: '0 32px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <Image
            src="/test-logo.png"
            alt="Slate360 Logo"
            height={72}
            width={180}
            style={{ objectFit: 'contain', display: 'block' }}
            priority
          />
        </Link>
        <ul style={{ display: 'flex', alignItems: 'center', gap: 32, margin: 0, padding: 0, listStyle: 'none' }}>
          {links.map(l => (
            <li key={l.href}>
              <Link
                href={l.href}
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  color: '#222',
                  textDecoration: 'none',
                  padding: '6px 10px',
                  borderRadius: 6,
                  transition: 'background 0.2s, color 0.2s',
                  display: 'inline-block',
                }}
                onMouseOver={e => (e.currentTarget.style.color = '#4B9CD3')}
                onMouseOut={e => (e.currentTarget.style.color = '#222')}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
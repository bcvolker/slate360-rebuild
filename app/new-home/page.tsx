import Image from 'next/image';
import Link from 'next/link';

export default function NewHome() {
  return (
    <div>
      <header style={{ width: '100%', background: '#fff', borderBottom: '1px solid #eee', boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)', position: 'sticky', top: 0, zIndex: 100 }}>
        <nav style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72, padding: '0 32px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <Image
              src="/logo.png"
              alt="Slate360 Logo"
              height={64}
              width={180}
              style={{ objectFit: 'contain', display: 'block' }}
              priority
            />
          </Link>
        </nav>
      </header>
      <main>
        <h1>New Home Test</h1>
      </main>
    </div>
  );
}

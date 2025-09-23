import Link from 'next/link';
export default function Header() {
  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: 80, width: '100%', background: 'orange', padding: 16 }}>
      <span style={{ color: 'black', fontWeight: 'bold', fontSize: 24 }}>HEADER INLINE TEST</span>
    </header>
  );
}
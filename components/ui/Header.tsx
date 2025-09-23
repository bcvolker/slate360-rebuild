export default function Header() {
  return (
    <header style={{ width: '100%', background: '#fff', padding: '16px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', borderBottom: '1px solid #eee' }}>
      <img
        src="/slate360-logo.png"
        alt="Slate360 Logo"
        style={{ height: '80px', width: 'auto', objectFit: 'contain', display: 'block' }}
      />
    </header>
  );
}
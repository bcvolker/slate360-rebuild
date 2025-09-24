
export default function Page() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      gap: '2rem',
      backgroundColor: 'white',
      color: 'black'
    }}>
      {/* Temporary placeholder until real logo is added */}
      <div style={{
        width: 200,
        height: 60,
        backgroundColor: '#4B9CD3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        color: 'white',
        fontWeight: 'bold'
      }}>
        SLATE360 LOGO
      </div>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Slate360</h1>
    </div>
  );
}


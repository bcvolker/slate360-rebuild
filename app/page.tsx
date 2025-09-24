
import Image from "next/image";

export default function Page() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      gap: '2rem'
    }}>
      <Image 
        src="/logo.png" 
        alt="Slate360 Logo" 
        width={200} 
        height={60} 
      />
      <h1>Slate360</h1>
    </div>
  );
}


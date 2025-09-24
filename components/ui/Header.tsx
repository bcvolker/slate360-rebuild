
import Image from "next/image";

export default function Header() {
  return (
    <header className="flex items-center justify-between p-4 bg-white shadow">
      <Image
        src="/slate360-identity.png"
        alt="Slate360 Logo"
        width={160}
        height={50}
        priority
      />
      {/* keep existing nav links and structure intact */}
    </header>
  );
}
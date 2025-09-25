import Image from 'next/image';
import Link from 'next/link';

export default function SiteLogo() {
  return (
    <Link href="/" className="fixed top-1 left-6 z-50 pointer-events-auto">
      <Image
        src="/slate360logoforwebsite.png"
        alt="Slate360 Logo"
        width={220}
        height={74}
        priority
        className="h-auto w-auto object-contain"
      />
    </Link>
  );
}

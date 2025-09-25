import Image from 'next/image';
import Link from 'next/link';

export default function SiteLogo() {
  return (
    <Link href="/" className="fixed top-2 left-6 z-50 pointer-events-auto">
      <Image
        src="/slate360logoforwebsite.png"
        alt="Slate360 Logo"
        width={160}
        height={48}
        priority
        className="h-12 w-auto object-contain"
      />
    </Link>
  );
}

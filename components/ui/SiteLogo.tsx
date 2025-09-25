import Image from 'next/image';
import Link from 'next/link';

export default function SiteLogo() {
  return (
    <Link href="/" className="fixed top-3 right-6 z-[60] pointer-events-auto">
      <Image
        src="/slate360logoforwebsite.png"
        alt="Slate360 Logo"
        width={208}
        height={62}
        priority
        className="h-16 w-auto object-contain"
      />
    </Link>
  );
}

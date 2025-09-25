import Image from 'next/image';
import Link from 'next/link';

export default function SiteLogo() {
  return (
    <Link
      href="/"
      aria-label="Go to Homepage"
      className="fixed left-6 top-2 z-50 block"
    >
      <div className="relative h-[64px] w-[230px]">
        <Image
          src="/slate360logoforwebsite.png"
          alt="Slate360 Logo"
          fill
          priority
          sizes="230px"
          className="object-contain drop-shadow-md"
        />
      </div>
    </Link>
  );
}

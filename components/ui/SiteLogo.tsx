import Image from 'next/image';
import Link from 'next/link';

export default function SiteLogo() {
  return (
    <Link
      href="/"
      aria-label="Go to Homepage"
      className="fixed left-6 top-[52px] z-50 block"
    >
      <div className="relative h-[74px] w-[265px]">
        <Image
          src="/slate360logoforwebsite.png"
          alt="Slate360 Logo"
          fill
          priority
          sizes="265px"
          className="object-contain drop-shadow-md"
        />
      </div>
    </Link>
  );
}

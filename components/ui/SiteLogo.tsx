import Image from 'next/image';
import Link from 'next/link';

export default function SiteLogo(){
  return (
    <Link href="/" className="fixed top-2 left-4 z-50 inline-block">
      <span className="relative inline-flex items-center">
        <span className="absolute inset-0 rounded-md bg-copper/14"></span>
        <Image
          src="/slate360logoforwebsite.png"
          alt="Slate360"
          width={180}
          height={54}
          priority
          className="relative h-12 w-auto object-contain drop-shadow"
        />
      </span>
    </Link>
  );
}

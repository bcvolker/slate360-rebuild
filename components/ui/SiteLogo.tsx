import Image from "next/image";
import Link from "next/link";

export default function SiteLogo() {
  return (
    <Link
      href="/"
      className="fixed top-4 left-6 z-30 pointer-events-auto hidden md:inline-flex items-center"
    >
      <Image
        src="/slate360logoforwebsite.png"
        alt="Slate360 Logo"
        width={325}
        height={98}
        priority
        className="h-[5.7rem] w-auto object-contain drop-shadow-md"
      />
    </Link>
  );
}

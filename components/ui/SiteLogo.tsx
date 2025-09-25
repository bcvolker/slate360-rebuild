import Image from "next/image";
import Link from "next/link";

export default function SiteLogo() {
  return (
    <Link
      href="/"
      className="fixed top-2 left-4 z-50 pointer-events-auto flex items-center"
    >
      <span className="absolute inset-0 bg-[#B87333]/80 rounded-md -z-10" />
      <Image
        src="/slate360logoforwebsite.png"
        alt="Slate360 Logo"
        width={220}
        height={74}
        priority
        className="h-auto w-auto object-contain drop-shadow-md"
      />
    </Link>
  );
}

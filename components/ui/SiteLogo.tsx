import Image from "next/image";
import Link from "next/link";

export default function SiteLogo() {
  return (
    <Link
      href="/"
      className="fixed top-3 left-6 z-[100] pointer-events-auto inline-flex items-center"
    >
      <span className="absolute inset-0 bg-[#B87333]/80 rounded-md -z-10" />
      <Image
        src="/slate360logoforwebsite.png"
        alt="Slate360 Logo"
        width={200}
        height={60}
        priority
        className="h-14 w-auto object-contain drop-shadow-md relative z-10"
      />
    </Link>
  );
}

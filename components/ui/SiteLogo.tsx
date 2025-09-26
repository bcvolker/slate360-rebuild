import Image from "next/image";
import Link from "next/link";

export default function SiteLogo() {
  return (
    <Link
      href="/"
      className="fixed top-14 left-6 z-[100] pointer-events-auto inline-flex items-center"
    >
      <span className="absolute inset-0 bg-[#B87333]/80 rounded-lg -z-10 px-3 py-2" />
      <Image
        src="/slate360logoforwebsite.png"
        alt="Slate360 Logo"
        width={260}
        height={78}
        priority
        className="h-[4.55rem] w-auto object-contain drop-shadow-md relative z-10 mx-3 my-2"
      />
    </Link>
  );
}

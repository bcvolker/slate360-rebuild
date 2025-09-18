
import Image from 'next/image';

type LogoProps = {
  className?: string;
};

export default function Logo({ className }: LogoProps) {
  return (
    <Image src="/logo.png" alt="Slate360" width={120} height={32} className={className ? className + ' animate-fly-in' : 'animate-fly-in'} />
  );
}

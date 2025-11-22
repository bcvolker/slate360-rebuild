


type LogoProps = {
  className?: string;
};

export default function Logo({ className }: LogoProps) {
  return (
    <svg
      width={120}
      height={32}
      viewBox="0 0 120 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className ? className + ' animate-fly-in' : 'animate-fly-in'}
    >
      <rect width="120" height="32" rx="8" fill="rgb(var(--color-accent))" />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#fff"
        fontSize="18"
        fontFamily="sans-serif"
        fontWeight="bold"
      >
        Slate360
      </text>
    </svg>
  );
}

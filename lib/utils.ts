// Simple cn utility for className merging
export function cn(...args: (string | number | undefined | null | false)[]): string {
  return args.filter(Boolean).join(' ');
}

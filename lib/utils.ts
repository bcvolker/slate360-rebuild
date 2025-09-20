// Simple cn utility for className merging
export function cn(...args: any[]): string {
  return args.filter(Boolean).join(' ');
}

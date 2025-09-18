import clsx from 'clsx';

export default function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('p-6 rounded-lg shadow-lg bg-white/80 backdrop-blur-sm', className)}>{children}</div>;
}

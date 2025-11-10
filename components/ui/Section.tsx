import clsx from 'clsx';

export default function Section({
  id,
  children,
  className,
}: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <section
      id={id}
      className={clsx(
  'snap-start min-h-90vh py-12 md:py-20 flex items-center',
        'scroll-mt-[64px]', // for slim navbar
        className
      )}
    >
      <div className="mx-auto w-full max-w-7xl px-4">{children}</div>
    </section>
  );
}
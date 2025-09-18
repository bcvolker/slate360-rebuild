
import clsx from 'clsx';

type SectionHeaderProps = { title: string; subtitle?: string; align?: 'left' | 'center'; };

export default function SectionHeader({ title, subtitle, align = 'left' }: SectionHeaderProps) {
  return (
    <div className={clsx(align === 'center' ? 'text-center' : 'text-left')}>
      <h2 className="responsive-title">{title}</h2>
      {subtitle && <p className="responsive-subtitle">{subtitle}</p>}
    </div>
  );
}

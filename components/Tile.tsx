import Link from 'next/link';
import MediaViewer from './MediaViewer';
import clsx from 'clsx';

export interface FeatureItem { 
  text: string;
}

export interface TileProps {
  id: string;
  title: string;
  description: string;
  cta?: { href: string; label: string };
  learnMoreHref: string;
  media: { type: 'image' | 'video' | 'model' | 'tour'; src: string; poster?: string; alt?: string };
  reverse?: boolean;     // alternate layout
  biggerHero?: boolean;  // slightly larger media for hero tile
  features?: FeatureItem[];
}

export default function Tile({
  id, title, description, cta, learnMoreHref, media, reverse, biggerHero, features = [],
}: TileProps) {
  return (
    <div className={clsx('grid items-center gap-8 md:gap-12', reverse ? 'md:grid-cols-2 md:[&>*:first-child]:order-2' : 'md:grid-cols-2')}>
      <div className={clsx(biggerHero ? 'md:col-span-1 md:scale-[1.03]' : '')}>
        <MediaViewer media={media} label={title} />
      </div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-3 text-slate-600">{description}</p>

        {features.length > 0 && (
          <ul className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href={learnMoreHref}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            Learn More
          </Link>
          {cta && (
            <Link
              href={cta.href}
              className="text-sm font-medium text-sky-700 hover:text-sky-900"
            >
              {cta.label} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
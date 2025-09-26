
import { tileData } from '@/lib/tile-data';
import PageClient from './PageClient';

export default function HomePage() {
  return (
    <div id="snap-container" className="w-full md:snap-y md:snap-mandatory md:overflow-y-scroll md:h-screen md:scroll-smooth">
      <PageClient tileData={tileData} />
    </div>
  );
}


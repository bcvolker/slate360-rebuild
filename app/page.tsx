
import { tileData } from '@/lib/tile-data';
import PageClient from './PageClient';

export default function HomePage() {
  return (
    <div className="md:snap-y md:snap-mandatory md:overflow-y-scroll md:h-screen">
      <PageClient tileData={tileData} />
    </div>
  );
}


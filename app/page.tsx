
import { tileData } from '@/lib/tile-data';
import PageClient from './PageClient';

export default function HomePage() {
  return (
    <div className="w-full overflow-y-auto md:snap-y md:snap-mandatory md:overflow-y-scroll md:h-screen">
      <PageClient tileData={tileData} />
    </div>
  );
}


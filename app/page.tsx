
import { tileData } from '@/lib/tile-data';
import PageClient from './PageClient';

export default function HomePage() {
  return (
    <div className="md:snap-y md:snap-mandatory overflow-y-scroll h-screen">
      <PageClient tileData={tileData} />
    </div>
  );
}


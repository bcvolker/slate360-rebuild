
import { tileData } from '@/lib/tile-data';
import PageClient from './PageClient';

export default function HomePage() {
  return (
    <main className="fixed inset-0 top-[88px] snap-y snap-mandatory overflow-y-scroll scroll-smooth">
      <PageClient tileData={tileData} />
    </main>
  );
}


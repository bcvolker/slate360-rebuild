import { tileData } from '@/lib/tile-data';
import PageClient from './PageClient';

export default function HomePage() {
  return (
    <>
      <main className="min-h-screen w-full bg-animated-gradient flex flex-col items-center justify-start pt-0">
        <PageClient tileData={tileData} />
      </main>
    </>
  );
}


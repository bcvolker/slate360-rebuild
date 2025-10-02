import { tileData } from '@/lib/tile-data';
import PageClient from './PageClient';

export default function HomePage() {
  return (
    <>
      {/* Banner removed; only Navbar will show at top */}
      <main className="min-h-screen w-full bg-animated-gradient flex flex-col items-center justify-start pt-0">
        <PageClient tileData={tileData} />
      </main>
    </>
  );
}


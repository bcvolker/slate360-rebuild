import { tileData } from '@/lib/tile-data';
import PageClient from './PageClient';

export default function HomePage() {
  return (
    <>
      {/* Banner restored */}
      <div className="fixed top-0 left-0 w-full bg-brand-blue text-white text-center py-2 text-base font-semibold z-[9999] shadow-lg">
        Slate360: From Design to Reality – All-in-One AEC SaaS Platform
      </div>
      <main className="min-h-screen w-full bg-animated-gradient flex flex-col items-center justify-start pt-0">
        <PageClient tileData={tileData} />
      </main>
    </>
  );
}


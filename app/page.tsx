import { tileData } from '@/lib/tile-data';
import PageClient from './PageClient';

export default function HomePage() {
  return (
    <>
      <div className="fixed top-0 left-0 w-full bg-yellow-400 text-black text-center py-1 text-sm z-[9999]">Slate360 Debug Build – Step 1 Complete</div>
      <PageClient tileData={tileData} />
    </>
  );
}


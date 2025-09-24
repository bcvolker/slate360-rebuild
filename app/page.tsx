
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { LOGO_DATA_URI } from '../lib/logo.data';
import HomePageClient from './PageClient';

function MinimalHeader() {
  return (
    <header className="w-full bg-white border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={LOGO_DATA_URI}
            alt="Slate360 Logo"
            width={180}
            height={48}
            style={{ display: 'block' }}
          />
        </div>
        {/* Optional: temporary right-side space to keep layout stable */}
        <div style={{ width: 120, height: 1 }} />
      </div>
    </header>
  );
}

export default function Page() {
  return (
    <>
      <MinimalHeader />
      <HomePageClient />
    </>
  );
}


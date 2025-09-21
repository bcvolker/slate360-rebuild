
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import HomePageClient from './PageClient';

export default function Page() {
  return (
    <main className="bg-red-500 min-h-screen">
      <HomePageClient />
    </main>
  );
}

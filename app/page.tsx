
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import HomePageClient from './PageClient';
import { tileData } from '@/lib/tileData';

export default function Page() {
  return <HomePageClient tiles={tileData} />;
}

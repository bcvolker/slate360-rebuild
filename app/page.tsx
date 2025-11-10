import { tileData } from '@/lib/tile-data';
import PageClient from './PageClient';

export default function HomePage() {
  return (
    <>
      <PageClient tileData={tileData} />
    </>
  );
}


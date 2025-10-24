import { tileData } from '@/lib/tile-data';
import PageClient from './PageClient';

// DEBUG: added by automated revert flow
console.log("DEBUG: Reverted to 7f54ed9 -", new Date().toISOString());

export default function HomePage() {
  return (
    <>
      {/* Visible debug marker to confirm reverted build on the deployed site */}
      <div className="bg-red-200 text-center p-2">DEBUG: Reverted to 7f54ed9</div>
      <main className="min-h-screen w-full bg-animated-gradient flex flex-col items-center justify-start pt-0">
        <PageClient tileData={tileData} />
      </main>
    </>
  );
}


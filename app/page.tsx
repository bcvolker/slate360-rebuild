
import Logo from '@/components/ui/Logo';
import ClientHeader from '@/components/ui/ClientHeader';
import Tile from '@/components/ui/Tile';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SectionHeader from '@/components/ui/SectionHeader';
import MediaWrapper from '@/components/ui/MediaWrapper';

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-100 to-slate-300 dark:from-black dark:to-slate-900 text-gray-900 dark:text-white">
  <ClientHeader activeSection={null} />
      <section className="flex flex-col items-center justify-center py-16 px-4 md:px-0">
        <Logo className="w-32 h-32 mb-6" />
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 text-center">Slate360</h1>
        <p className="text-lg md:text-2xl text-center max-w-2xl mb-8">A modern, beautiful, and interactive homepage built with Next.js 15, Tailwind CSS v4, and CSS animations.</p>
        <Button as="a" href="#tiles" size="xl" className="mt-2">Explore the Tiles</Button>
      </section>
      <section id="tiles" className="snap-y snap-mandatory h-[90vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 md:px-12 py-12">
        <Tile title="Dashboard" description="Your personalized overview and quick stats." icon={<span>📊</span>} />
        <Tile title="Projects" description="Manage and track your projects efficiently." icon={<span>📁</span>} />
        <Tile title="Calendar" description="Stay on top of your schedule and events." icon={<span>📅</span>} />
        <Tile title="Team" description="Collaborate with your team in real time." icon={<span>👥</span>} />
        <Tile title="Media" description="View and share media files easily." icon={<span>🎬</span>} />
        <Tile title="Settings" description="Customize your experience and preferences." icon={<span>⚙️</span>} />
        <Tile title="Support" description="Get help and find answers quickly." icon={<span>💬</span>} />
      </section>
      <footer className="w-full py-8 flex flex-col items-center justify-center border-t border-gray-200 dark:border-gray-800 mt-12">
        <Logo className="w-10 h-10 mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">&copy; {new Date().getFullYear()} Slate360. All rights reserved.</p>
      </footer>
    </main>
  );
}

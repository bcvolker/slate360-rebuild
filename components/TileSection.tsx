import { Tile } from '@/lib/types';

export default function TileSection({ tile, index, isLast = false }: { tile: Tile; index: number; isLast?: boolean }) {
  return (
    <section id={tile.id} className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">{tile.title}</h2>
          <p className="text-lg text-gray-700">{tile.description}</p>
          <ul className="space-y-3">
            {tile.features.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-gray-700">
                <span className="text-orange-500 font-bold">✓</span> {f.text}
              </li>
            ))}
          </ul>
          <a href={tile.cta} className="inline-block text-blue-600 font-medium hover:text-blue-800">
            Learn more →
          </a>
        </div>
        <div className="flex justify-center">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-gray-800 to-black p-1.5 md:p-3 max-w-lg w-full">
            <div className="rounded-2xl bg-gray-900/90 backdrop-blur-sm p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-4 h-80 md:h-96">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">▶</span>
              </div>
              <h3 className="text-xl font-semibold text-white">{tile.title} Viewer</h3>
              <p className="text-sm text-gray-300">Interactive tools coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
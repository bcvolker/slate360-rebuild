"use client";
import { useState } from "react";

type Props = {
  tile: {
    id: string;
    title: string;
    description: string;
    features: string[];
    cta: string;
  };
  index: number;
};

const gradients = [
  'from-slate-50 to-blue-50',
  'from-orange-50 to-amber-50',
  'from-cyan-50 to-teal-50',
  'from-orange-50 to-amber-50',
  'from-orange-50 to-amber-50',
  'from-orange-50 to-amber-50',
  'from-cyan-50 to-teal-50',
];

export default function TileSection({ tile, index }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      id={tile.id}
      className={`snap-child min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br ${gradients[index % 7]}`}
    >
      <div className="max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-5xl font-bold">{tile.title}</h2>
          <p className="text-lg">{tile.description}</p>
          <ul className="space-y-2">
            {tile.features.map((f, j) => (
              <li key={j} className="flex items-center gap-2">
                <span className="text-orange-500">✓</span> {f}
              </li>
            ))}
          </ul>
          <a href={tile.cta} className="text-blue-600 font-medium">Learn more →</a>
        </div>
        <div className="flex justify-center">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-gray-800 to-black p-1.5 md:p-3 max-w-lg w-full">
            <div className="rounded-2xl bg-gray-900/90 backdrop-blur-sm p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-4 h-80 md:h-96">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">▶</span>
              </div>
              <h3 className="text-xl font-semibold text-white">{tile.title} Viewer</h3>
              <p className="text-sm text-gray-300">Interactive tools coming soon</p>
              <button onClick={() => setExpanded(!expanded)} className="md:hidden text-white">
                {expanded ? 'Close' : 'Expand'}
              </button>
              {expanded && (
                <div className="md:hidden mt-4 w-full h-64 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  Expanded Viewer
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
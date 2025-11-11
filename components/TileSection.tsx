type Props = {
  tile: {
    id: string;
    title: string;
    description: string;
    // support either string[] or Feature[] shapes
    features: Array<string | { text?: string }>;
    cta: string;
  };
  index: number;
  isLast?: boolean;
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

export default function TileSection({ tile, index, isLast = false }: Props) {
  return (
    <section
      id={tile.id}
      className={`min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br ${gradients[index % 7]}`}
    >
      <div className="max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-5xl font-bold">{tile.title}</h2>
          <p className="text-lg">{tile.description}</p>
          <ul className="space-y-2">
            {tile.features.map((f, i) => {
              const text = typeof f === 'string' ? f : f?.text || '';
              return (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-orange-500">✓</span> {text}
                </li>
              );
            })}
          </ul>
          <a href={tile.cta} className="text-blue-600 font-medium">Learn more →</a>
        </div>
        <div className="bg-slate-900 rounded-3xl p-8 text-white text-center">
          <div className="text-6xl mb-4">🔧</div>
          <h3 className="text-xl font-semibold">{tile.title} Viewer</h3>
          <p className="text-sm mt-2">Interactive tools coming soon</p>
        </div>
      </div>
    </section>
  );
}


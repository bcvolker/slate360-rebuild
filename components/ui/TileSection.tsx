'use client'
import Link from 'next/link'

interface Tile {
  id: string
  title: string
  subtitle: string
  bullets: string[]
  cta: string
  viewer: string
  link: string
}

interface Props {
  tiles: Tile[]
}

export default function TileSection({ tiles }: Props) {
  return (
    <div className="flex flex-col space-y-0">
      {tiles.map((tile) => (
        <section 
          key={tile.id} 
          className="min-h-screen snap-start scroll-mt-16 pt-8 flex flex-col md:flex-row items-center justify-center bg-slate-900 text-white px-4 py-8"
        >
          <div className="md:flex-[0.9] order-2 md:order-1 w-full md:w-auto mb-4 md:mb-0">
            <h2 className="text-sm mb-4 font-bold uppercase text-blue-400">{tile.id.toUpperCase()}</h2>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{tile.title}</h1>
            <p className="text-lg mb-6 opacity-90">{tile.subtitle}</p>
            <ul className="space-y-2 mb-6">
              {tile.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <Link 
              href={tile.link} 
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-full text-white font-semibold"
            >
              {tile.cta}
            </Link>
          </div>
          <div className="md:flex-[1.1] order-1 md:order-2 w-full mb-4 md:mb-0">
            <div className="viewer-card w-full max-w-md md:max-w-2xl mx-auto flex-shrink-0 bg-slate-800 rounded-lg p-6 text-center h-96">
              <p className="text-slate-400">{tile.viewer}</p>
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
import Link from "next/link";
import type { ProjectExperience } from "@/lib/client-experience/types";
import { formatDate, visitById } from "@/lib/client-experience/utils";

type Tile = { key: string; href: string; title: string; meta: string; img: string };

/** Only published modalities are rendered — nothing empty or unpurchased. */
export function modalityTiles(data: ProjectExperience): Tile[] {
  const base = data.basePath;
  const tiles: Tile[] = [];
  if (data.walkthrough) {
    const v = visitById(data, data.walkthrough.visitId);
    tiles.push({ key: "walk", href: `${base}/walk`, title: "Spatial Walkthrough", meta: `${v ? formatDate(v.capturedAt) : ""} · ${data.walkthrough.spaces.length} spaces`, img: data.walkthrough.posterUrl });
  }
  if (data.twin) {
    const v = visitById(data, data.twin.visitId);
    tiles.push({ key: "twin", href: `${base}/twin`, title: "3D Reality Twin", meta: `${v ? formatDate(v.capturedAt) : ""} · Walk, orbit, overview`, img: data.stations[2]?.thumbUrl ?? data.project.coverUrl });
  }
  if (data.stations.length > 0) {
    const latest = data.stations.reduce((a, b) => (a.capturedAt > b.capturedAt ? a : b));
    tiles.push({ key: "stations", href: `${base}/stations`, title: "360 Documentation", meta: `${data.stations.length} stations · latest ${formatDate(latest.capturedAt)}`, img: latest.thumbUrl });
  }
  return tiles;
}

export function ModalityTiles({ data }: { data: ProjectExperience }) {
  const tiles = modalityTiles(data);
  return (
    <div className={`ce-grid ce-grid--${Math.min(tiles.length, 4) as 1 | 2 | 3 | 4}`}>
      {tiles.map((t) => (
        <Link key={t.key} href={t.href} className="ce-tile" data-testid={`modality-${t.key}`}>
          <img src={t.img} alt="" className="ce-tile__img ce-tile__img--wide" />
          <div className="ce-tile__body">
            <div className="ce-tile__title">{t.title}</div>
            <div className="ce-tile__meta">{t.meta}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

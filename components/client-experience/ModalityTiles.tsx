import Link from "next/link";
import type { ProjectExperience } from "@/lib/client-experience/types";
import { formatDate, visitById, withSuffix } from "@/lib/client-experience/utils";
import { realityTiles } from "@/lib/client-experience/layout";

type Tile = { key: string; href: string; title: string; meta: string; img: string };

/** Only published, accepted modalities are rendered — nothing empty, nothing "coming soon". */
export function modalityTiles(data: ProjectExperience): Tile[] {
  const base = data.basePath, q = data.linkSuffix;
  const tiles: Tile[] = [];
  for (const kind of realityTiles(data)) {
    if (kind === "walkthrough" && data.walkthrough) {
      const v = visitById(data, data.walkthrough.visitId);
      tiles.push({ key: "walk", href: withSuffix(`${base}/walk`, q), title: "Spatial Walkthrough", meta: `${v ? formatDate(v.capturedAt) : ""} · ${data.walkthrough.spaces.length} spaces`, img: data.walkthrough.posterUrl });
    } else if (kind === "twin" && data.twin) {
      const v = visitById(data, data.twin.visitId);
      tiles.push({ key: "twin", href: withSuffix(`${base}/twin`, q), title: "3D Reality Twin", meta: `${v ? formatDate(v.capturedAt) : ""} · Walk, orbit, overview`, img: data.stations[2]?.thumbUrl ?? data.project.coverUrl });
    } else if (kind === "stations" && data.stations.length) {
      const latest = data.stations.reduce((a, b) => (a.capturedAt > b.capturedAt ? a : b));
      tiles.push({ key: "stations", href: withSuffix(`${base}/stations`, q), title: "360 Documentation", meta: `${data.stations.length} stations · latest ${formatDate(latest.capturedAt)}`, img: latest.thumbUrl });
    }
  }
  return tiles;
}

export function ModalityTiles({ data }: { data: ProjectExperience }) {
  const tiles = modalityTiles(data);
  if (!tiles.length) return null;
  return (
    <div className={`ce-grid ce-grid--${Math.min(tiles.length, 4) as 1 | 2 | 3 | 4}`}>
      {tiles.map((t) => (
        <Link key={t.key} href={t.href} className="ce-tile" data-testid={`modality-${t.key}`}>
          <img src={t.img} alt="" className="ce-tile__img ce-tile__img--wide" loading="lazy" />
          <div className="ce-tile__body">
            <div className="ce-tile__title">{t.title}</div>
            <div className="ce-tile__meta">{t.meta}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

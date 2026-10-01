/** Empty equirect shell for the marketing walk. No site photography. */

const W = 768;
const H = 384;

type RGB = [number, number, number];

const CEIL: RGB = [247, 248, 246];
const WALL: RGB = [228, 233, 229];
const FLOOR: RGB = [196, 207, 200];
const LINE: RGB = [26, 36, 51];
const MARK: RGB = [12, 122, 82];

function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function wrap(n: number, size: number): number {
  return ((n % size) + size) % size;
}

function shade(stop: number, lon: number, lat: number): RGB {
  const dx = Math.cos(lat) * Math.sin(lon);
  const dy = Math.sin(lat);
  const dz = Math.cos(lat) * Math.cos(lon);
  const oy = 0.12;
  const oz = [-1.55, 0.05, 1.45][stop] ?? 0;
  const hx = 2.15;
  const hy = 1.28;
  const hz = 3.05;
  let best = 1e9;
  let nx = 0;
  let ny = 0;
  let nz = 0;
  let px = 0;
  let py = 0;
  let pz = 0;

  const take = (t: number, nxx: number, nyy: number, nzz: number) => {
    if (t <= 0.04 || t >= best) return;
    const x = dx * t;
    const y = oy + dy * t;
    const z = oz + dz * t;
    if (Math.abs(nxx) < 0.5 && Math.abs(x) > hx + 0.02) return;
    if (Math.abs(nyy) < 0.5 && (y > hy + 0.02 || y < -hy - 0.02)) return;
    if (Math.abs(nzz) < 0.5 && Math.abs(z) > hz + 0.02) return;
    best = t;
    nx = nxx;
    ny = nyy;
    nz = nzz;
    px = x;
    py = y;
    pz = z;
  };

  if (Math.abs(dx) > 1e-5) {
    take(hx / dx, 1, 0, 0);
    take(-hx / dx, -1, 0, 0);
  }
  if (Math.abs(dy) > 1e-5) {
    take((hy - oy) / dy, 0, 1, 0);
    take((-hy - oy) / dy, 0, -1, 0);
  }
  if (Math.abs(dz) > 1e-5) {
    take((hz - oz) / dz, 0, 0, 1);
    take((-hz - oz) / dz, 0, 0, -1);
  }

  let rgb: RGB = ny > 0.5 ? CEIL : ny < -0.5 ? FLOOR : WALL;
  if (ny < -0.5) {
    if (wrap(px, 0.7) < 0.016 || wrap(pz, 0.7) < 0.016) rgb = mix(FLOOR, LINE, 0.28);
  } else if (Math.abs(ny) < 0.5) {
    const along = Math.abs(nx) > 0.5 ? pz : px;
    if (wrap(along, 1.15) < 0.012 || Math.abs(py + 1.05) < 0.016) rgb = mix(WALL, LINE, 0.35);
    if (nz > 0.5 && Math.abs(px) < 0.42 && py > -0.95 && py < 0.55) rgb = [186, 198, 192];
  }

  const mz = [-0.4, 0.85, 2.15][stop] ?? 0;
  if (nx > 0.5 && Math.hypot(px - (hx - 0.02), py - 0.15, pz - mz) < 0.18) rgb = MARK;
  return rgb;
}

export function buildDemoPanorama(stop: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(W, H);
  const data = img.data;
  for (let y = 0; y < H; y += 1) {
    const lat = (0.5 - (y + 0.5) / H) * Math.PI;
    for (let x = 0; x < W; x += 1) {
      const lon = ((x + 0.5) / W) * Math.PI * 2 - Math.PI;
      const [r, g, b] = shade(stop, lon, lat);
      const i = (y * W + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const oz = [-1.55, 0.05, 1.45][stop] ?? 0;
  const mz = [-0.4, 0.85, 2.15][stop] ?? 0;
  const mwx = 2.13;
  const mwy = 0.03;
  const mwz = mz - oz;
  const lon = Math.atan2(mwx, mwz);
  const lat = Math.atan2(mwy, Math.hypot(mwx, mwz));
  const cx = ((lon + Math.PI) / (Math.PI * 2)) * W;
  const cy = (0.5 - lat / Math.PI) * H;
  ctx.fillStyle = "#F7F8F6";
  ctx.font = "600 18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(stop + 1), cx, cy);

  return canvas.toDataURL("image/jpeg", 0.82);
}

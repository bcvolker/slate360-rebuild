import * as THREE from "three";

/** Read a CSS custom property as a three.js colour (keeps the palette in globals.css, no hex in code). */
export function cssColor(name: string, fallbackVar = "--mkt-ink"): THREE.Color {
  if (typeof window === "undefined") return new THREE.Color();
  const style = getComputedStyle(document.documentElement);
  const v = style.getPropertyValue(name).trim() || style.getPropertyValue(fallbackVar).trim();
  const c = new THREE.Color();
  if (v) c.setStyle(v);
  return c;
}

/**
 * A rounded plaque: soft drop shadow (separates it from light walls), thick Slate360-green edge, a mostly opaque
 * light face with a faint top highlight (reads as a physical plaque on dark floors), and an icon glyph
 * (drawing = sheet with a plan grid, photo = frame with a mountain). `on` = selected (accent face, light glyph).
 */
export function plaqueTexture(icon: "drawing" | "photo", accent: THREE.Color, on: boolean): THREE.CanvasTexture {
  const S = 192;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const g = cv.getContext("2d")!;
  const green = `#${accent.getHexString()}`;
  const light = cssColor("--mkt-surface").getStyle();
  const shade = cssColor("--graphite-canvas").getStyle();
  const face = on ? green : light;
  const ink = on ? light : green;
  const r = 40;
  // drop shadow
  g.save();
  g.shadowColor = shade;
  g.shadowBlur = 16;
  g.shadowOffsetY = 6;
  g.globalAlpha = 0.55;
  g.beginPath();
  g.roundRect(22, 22, S - 44, S - 44, r);
  g.fillStyle = shade;
  g.fill();
  g.restore();
  // face
  g.beginPath();
  g.roundRect(20, 18, S - 40, S - 40, r);
  g.globalAlpha = 0.96;
  g.fillStyle = face;
  g.fill();
  g.globalAlpha = 1;
  // faint top highlight for depth
  const hl = g.createLinearGradient(0, 18, 0, S / 2);
  hl.addColorStop(0, "rgba(255,255,255,0.35)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = hl;
  g.fill();
  // thick accent edge + fine dark outline (visible on white walls)
  g.lineWidth = 10;
  g.strokeStyle = green;
  g.stroke();
  g.lineWidth = 2;
  g.strokeStyle = shade;
  g.globalAlpha = 0.45;
  g.beginPath();
  g.roundRect(14, 12, S - 28, S - 28, r + 6);
  g.stroke();
  g.globalAlpha = 1;
  // glyph
  g.strokeStyle = ink;
  g.fillStyle = ink;
  g.lineWidth = 8;
  g.lineJoin = "round";
  const o = { x: S / 2, y: S / 2 - 2 };
  if (icon === "drawing") {
    g.strokeRect(o.x - 36, o.y - 42, 72, 84);
    g.lineWidth = 4;
    for (const dy of [-14, 10]) {
      g.beginPath();
      g.moveTo(o.x - 28, o.y + dy);
      g.lineTo(o.x + 28, o.y + dy);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(o.x, o.y - 34);
    g.lineTo(o.x, o.y + 34);
    g.stroke();
  } else {
    g.strokeRect(o.x - 42, o.y - 32, 84, 64);
    g.beginPath();
    g.moveTo(o.x - 34, o.y + 24);
    g.lineTo(o.x - 10, o.y - 4);
    g.lineTo(o.x + 6, o.y + 12);
    g.lineTo(o.x + 16, o.y + 2);
    g.lineTo(o.x + 34, o.y + 24);
    g.closePath();
    g.fill();
    g.beginPath();
    g.arc(o.x + 20, o.y - 14, 7, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

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
 * A small rounded plaque: light face, accent ring, a simple icon glyph (drawing = sheet with a plan grid,
 * photo = frame with a mountain). `on` = selected/hover (accent face, light glyph). Rendered to a canvas once.
 */
export function plaqueTexture(icon: "drawing" | "photo", accent: THREE.Color, on: boolean): THREE.CanvasTexture {
  const S = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const g = cv.getContext("2d")!;
  const face = on ? `#${accent.getHexString()}` : cssColor("--mkt-surface").getStyle();
  const ink = on ? cssColor("--mkt-surface").getStyle() : `#${accent.getHexString()}`;
  const r = 30;
  g.beginPath();
  g.roundRect(8, 8, S - 16, S - 16, r);
  g.fillStyle = face;
  g.fill();
  g.lineWidth = 7;
  g.strokeStyle = `#${accent.getHexString()}`;
  g.stroke();
  g.strokeStyle = ink;
  g.fillStyle = ink;
  g.lineWidth = 6;
  g.lineJoin = "round";
  if (icon === "drawing") {
    g.strokeRect(38, 34, 52, 60);
    g.lineWidth = 3;
    for (const y of [52, 68]) {
      g.beginPath();
      g.moveTo(44, y);
      g.lineTo(84, y);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(64, 40);
    g.lineTo(64, 88);
    g.stroke();
  } else {
    g.strokeRect(34, 40, 60, 48);
    g.beginPath();
    g.moveTo(40, 82);
    g.lineTo(58, 62);
    g.lineTo(70, 74);
    g.lineTo(78, 66);
    g.lineTo(88, 82);
    g.closePath();
    g.fill();
    g.beginPath();
    g.arc(80, 52, 5, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

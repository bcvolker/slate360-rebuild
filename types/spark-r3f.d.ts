/**
 * JSX typings for the @sparkjsdev/spark elements registered with React Three Fiber
 * via `extend({ SparkRenderer, SplatMesh })` in splat-viewer-scene.tsx.
 *
 * Without this augmentation, <sparkRenderer> / <splatMesh> are unknown to TS
 * (TS2339 on JSX.IntrinsicElements). Type-only — no runtime effect.
 */
import type { ThreeElement } from "@react-three/fiber";
import type { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

declare module "@react-three/fiber" {
  interface ThreeElements {
    sparkRenderer: ThreeElement<typeof SparkRenderer>;
    splatMesh: ThreeElement<typeof SplatMesh>;
  }
}

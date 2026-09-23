/**
 * JSX typings for Spark elements registered with React Three Fiber.
 * Type-only. Importing this module does not change rendering.
 */
import type { ThreeElement } from "@react-three/fiber";
import type { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

declare module "@react-three/fiber" {
  interface ThreeElements {
    sparkRenderer: ThreeElement<typeof SparkRenderer>;
    splatMesh: ThreeElement<typeof SplatMesh>;
  }
}

export {};

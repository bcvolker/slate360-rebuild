import type { Object3DNode } from "@react-three/fiber";
import type {
  SparkRenderer as SparkRendererImpl,
  SplatMesh as SplatMeshImpl,
} from "@sparkjsdev/spark";

declare module "@react-three/fiber" {
  interface ThreeElements {
    sparkRenderer: Object3DNode<SparkRendererImpl, typeof SparkRendererImpl>;
    splatMesh: Object3DNode<SplatMeshImpl, typeof SplatMeshImpl>;
  }
}

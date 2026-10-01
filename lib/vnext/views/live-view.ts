type Reader = () => unknown;

let reader: Reader | null = null;

export function registerLiveView(next: Reader): () => void {
  reader = next;
  return () => {
    if (reader === next) reader = null;
  };
}

export function readLiveView(): unknown {
  return reader ? reader() : null;
}

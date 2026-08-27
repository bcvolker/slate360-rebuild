import { useCallback, useState } from "react";

export function DropZone({ onFile }: { onFile: (path: string, name: string) => void }) {
  const [active, setActive] = useState(false);

  const take = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const ext = file.name.toLowerCase();
      if (ext.endsWith(".insv")) {
        alert("Raw .insv is not supported in V0.1. Stitch a 2:1 equirectangular MP4 in Insta360 Studio first.");
        return;
      }
      if (!ext.endsWith(".mp4") && !ext.endsWith(".mov")) {
        alert("Drop a stitched equirectangular MP4.");
        return;
      }
      const path = (file as File & { path?: string }).path || file.name;
      onFile(path, file.name);
    },
    [onFile],
  );

  return (
    <div
      className={`drop ${active ? "active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setActive(false);
        take(e.dataTransfer.files[0]);
      }}
    >
      <div>
        <div>DRAG STITCHED 360 VIDEO HERE</div>
        <div className="muted">2:1 equirectangular MP4 — not raw .insv</div>
        <input
          type="file"
          accept=".mp4,video/mp4"
          style={{ marginTop: 12 }}
          onChange={(e) => take(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}

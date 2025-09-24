import fs from "fs";
import path from "path";

export default function Debug() {
  const publicDir = path.join(process.cwd(), "public");
  let files: string[] = [];
  try {
    files = fs.readdirSync(publicDir);
  } catch (error) {
    console.error("Could not read public directory:", error);
  }

  return (
    <main className="p-10 bg-white text-black">
      <h1 className="text-2xl font-bold">Public Folder Contents</h1>
      <p>If `logo.png` is not on this list, it was not deployed.</p>
      <ul className="mt-4 space-y-2 list-disc list-inside">
        {files.length > 0 ? (
          files.map((f) => <li key={f}>{f}</li>)
        ) : (
          <li>Public directory is empty or could not be read.</li>
        )}
      </ul>
    </main>
  );
}

import { describe, expect, it } from "vitest";
import { loadRecentDocuments } from "./load-project-overview";

/**
 * Regression coverage for the Opus P1-M7 finding: Overview's "Recent Documents" widget used to
 * query slatedrop_uploads by a raw s3_key prefix match against every project_folders row, with no
 * folder_type filter at all — so an intake/capture/internal/commercial/operator upload could show
 * its real file name on the client-facing Overview even though the Documents page itself already
 * hides that folder. loadRecentDocuments now reuses the same clientFolderMap/isClientFile check
 * the Documents page uses (lib/vnext/documents/assemble-document.ts).
 */

type FolderRow = { id: string; name: string; folder_type: string | null; project_id: string };
type FileRow = {
  id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  folder_id: string | null;
  project_id: string | null;
  s3_key: string | null;
  created_at: string;
  status: string;
};

function fakeAdmin(folders: FolderRow[], files: FileRow[]) {
  return {
    from(table: string) {
      if (table === "project_folders") {
        return { select: () => ({ eq: () => Promise.resolve({ data: folders }) }) };
      }
      if (table === "slatedrop_uploads") {
        const chain = {
          in: () => chain,
          eq: () => chain,
          is: () => chain,
          order: () => chain,
          limit: () => Promise.resolve({ data: files }),
        };
        return { select: () => chain };
      }
      throw new Error(`unexpected table ${table}`);
      // eslint-disable-next-line no-unreachable
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

describe("loadRecentDocuments — client folder-type filtering", () => {
  it("excludes uploads in non-client folder types (intake) even though Documents-style filtering matches", async () => {
    const folders: FolderRow[] = [
      { id: "folder-intake", name: "Intake", folder_type: "intake", project_id: PROJECT_ID },
      { id: "folder-drawings", name: "Drawings", folder_type: "drawings", project_id: PROJECT_ID },
    ];
    const files: FileRow[] = [
      {
        id: "file-intake",
        file_name: "raw-capture-internal.jpg",
        file_size: 100,
        file_type: "image/jpeg",
        folder_id: "folder-intake",
        project_id: PROJECT_ID,
        s3_key: "orgs/x/folder-intake/raw-capture-internal.jpg",
        created_at: "2026-09-01T00:00:00Z",
        status: "active",
      },
      {
        id: "file-drawing",
        file_name: "A1.0-foundation.pdf",
        file_size: 200,
        file_type: "application/pdf",
        folder_id: "folder-drawings",
        project_id: PROJECT_ID,
        s3_key: "orgs/x/folder-drawings/A1.0-foundation.pdf",
        created_at: "2026-09-02T00:00:00Z",
        status: "active",
      },
    ];

    const admin = fakeAdmin(folders, files);
    const result = await loadRecentDocuments(admin, PROJECT_ID);

    expect(result.map((doc) => doc.id)).toEqual(["file-drawing"]);
    expect(result.some((doc) => doc.name === "raw-capture-internal.jpg")).toBe(false);
  });

  it("returns an empty list when the project has no client-visible folders at all", async () => {
    const folders: FolderRow[] = [
      { id: "folder-intake", name: "Intake", folder_type: "intake", project_id: PROJECT_ID },
    ];
    const admin = fakeAdmin(folders, []);
    const result = await loadRecentDocuments(admin, PROJECT_ID);
    expect(result).toEqual([]);
  });
});

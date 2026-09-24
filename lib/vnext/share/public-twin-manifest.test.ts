import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * streamPublicTwinManifest is the public counterpart of the authenticated vNext Reality manifest
 * route — the generic public Project/Evidence share viewer must render the SAME approved model
 * (baked output, correction_quaternion, edit_list) as the authenticated one, and must fail closed
 * on every unauthorized case the way the model STREAM itself already does.
 */

type ShareState =
  | { state: "unavailable" }
  | {
      state: "active";
      token: string;
      projectId: string;
      projectName: string;
      target: "project" | "saved_view";
      sections: string[];
      view: { representation: string; sourceId: string; projectId: string } | null;
    };

const share = { current: { state: "unavailable" } as ShareState };
const model = {
  current: null as null | { storageKey: string; editList: unknown; projectId: string },
};
const capabilityIncluded = { current: true };
const published = { current: true };
const s3Manifest = { current: '{"correction_quaternion":[0,0,0,1]}' as string | null };

function stubAdmin() {
  return {
    from(table: string) {
      if (table !== "digital_twin_models") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                maybeSingle: async () =>
                  model.current
                    ? {
                        data: {
                          storage_key: model.current.storageKey,
                          edit_list: model.current.editList,
                          digital_twin_spaces: { project_id: model.current.projectId },
                        },
                        error: null,
                      }
                    : { data: null, error: null },
              }),
            }),
          }),
        }),
      };
    },
  };
}

vi.mock("@/lib/vnext/share/resolve-public-share", () => ({
  resolvePublicShare: async (token: string) => ({
    admin: stubAdmin(),
    share: share.current.state === "active" ? { ...share.current, token } : share.current,
  }),
}));

vi.mock("@/lib/vnext/scope/read-project-scope", () => ({
  projectIncludesCapability: async () => capabilityIncluded.current,
}));

vi.mock("@/lib/vnext/release/source-visible", () => ({
  clientMayReadSource: async () => published.current,
}));

vi.mock("@aws-sdk/client-s3", () => ({
  GetObjectCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

vi.mock("@/lib/s3", () => ({
  BUCKET: "bucket",
  s3: {
    send: async () => {
      if (s3Manifest.current === null) throw new Error("not found");
      return { Body: { transformToString: async () => s3Manifest.current } };
    },
  },
}));

const { streamPublicTwinManifest } = await import("./public-media");

function activeProjectShare(): ShareState {
  return {
    state: "active",
    token: "tok",
    projectId: "p1",
    projectName: "Harbor",
    target: "project",
    sections: ["overview"],
    view: null,
  };
}

function activeEvidenceShare(): ShareState {
  return {
    state: "active",
    token: "tok",
    projectId: "p1",
    projectName: "Harbor",
    target: "saved_view",
    sections: [],
    view: { representation: "reality", sourceId: "model-1", projectId: "p1" },
  };
}

beforeEach(() => {
  share.current = { state: "unavailable" };
  model.current = { storageKey: "orgs/x/model-1.spz", editList: null, projectId: "p1" };
  capabilityIncluded.current = true;
  published.current = true;
  s3Manifest.current = '{"correction_quaternion":[0,0,0,1]}';
});

describe("streamPublicTwinManifest", () => {
  it("returns the manifest for an active project-token share when the model belongs to that project", async () => {
    share.current = activeProjectShare();
    const res = await streamPublicTwinManifest("tok", "model-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.correction_quaternion).toEqual([0, 0, 0, 1]);
  });

  it("returns the manifest for an active evidence (saved_view) token share", async () => {
    share.current = activeEvidenceShare();
    const res = await streamPublicTwinManifest("tok", "model-1");
    expect(res.status).toBe(200);
  });

  it("fails closed when the model belongs to a different project than the share", async () => {
    share.current = activeProjectShare();
    model.current = { storageKey: "orgs/x/model-1.spz", editList: null, projectId: "p2" };
    const res = await streamPublicTwinManifest("tok", "model-1");
    expect(res.status).toBe(404);
  });

  it("fails closed when the requested model does not exist (wrong source)", async () => {
    share.current = activeProjectShare();
    model.current = null;
    const res = await streamPublicTwinManifest("tok", "missing-model");
    expect(res.status).toBe(404);
  });

  it("fails closed when the share is revoked or expired (resolvePublicShare returns unavailable)", async () => {
    share.current = { state: "unavailable" };
    const res = await streamPublicTwinManifest("tok", "model-1");
    expect(res.status).toBe(404);
  });

  it("fails closed when Reality is not published for that exact source", async () => {
    share.current = activeProjectShare();
    published.current = false;
    const res = await streamPublicTwinManifest("tok", "model-1");
    expect(res.status).toBe(404);
  });

  it("fails closed when Reality is not an included client capability", async () => {
    share.current = activeProjectShare();
    capabilityIncluded.current = false;
    const res = await streamPublicTwinManifest("tok", "model-1");
    expect(res.status).toBe(404);
  });

  it("never leaks a manifest for a raw, non-spz storage key", async () => {
    share.current = activeProjectShare();
    model.current = { storageKey: "orgs/x/model-1.glb", editList: null, projectId: "p1" };
    const res = await streamPublicTwinManifest("tok", "model-1");
    expect(res.status).toBe(404);
  });
});

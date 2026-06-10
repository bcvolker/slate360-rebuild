/** In-memory plan pin store for dev sandbox — mirrors POST/GET /api/site-walk/pins. */

import type { SiteWalkPin } from "@/lib/types/site-walk";

type DevPinRow = SiteWalkPin;

const store = new Map<string, DevPinRow[]>();
const STORAGE_KEY = "dev-plan-pin-store-v1";

function persistStore() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...store.entries()]));
}

function hydrateStore() {
  if (typeof sessionStorage === "undefined") return;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const entries = JSON.parse(raw) as Array<[string, DevPinRow[]]>;
    store.clear();
    for (const [key, rows] of entries) store.set(key, rows);
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

if (typeof window !== "undefined") hydrateStore();

function sheetKey(planSheetId: string) {
  return planSheetId;
}

export function devPlanPinStoreList(planSheetId: string): DevPinRow[] {
  return [...(store.get(sheetKey(planSheetId)) ?? [])];
}

export function devPlanPinStoreCount(planSheetId: string): number {
  return devPlanPinStoreList(planSheetId).length;
}

export function devPlanPinStoreInsert(row: DevPinRow): DevPinRow {
  const key = sheetKey(row.plan_sheet_id ?? "");
  const rows = store.get(key) ?? [];
  const duplicate = rows.find(
    (entry) => entry.client_pin_id && entry.client_pin_id === row.client_pin_id,
  );
  if (duplicate) return duplicate;
  store.set(key, [...rows, row]);
  persistStore();
  return row;
}

export function devPlanPinStorePatch(
  pinId: string,
  patch: Partial<Pick<DevPinRow, "item_id" | "pin_status">>,
): DevPinRow | null {
  for (const [key, rows] of store.entries()) {
    const index = rows.findIndex((entry) => entry.id === pinId);
    if (index < 0) continue;
    const next = { ...rows[index]!, ...patch, updated_at: new Date().toISOString() };
    const updated = [...rows];
    updated[index] = next;
    store.set(key, updated);
    persistStore();
    return next;
  }
  return null;
}

export function devPlanPinStoreAttachItem(
  pinId: string,
  itemId: string,
): DevPinRow | null {
  for (const [key, rows] of store.entries()) {
    const index = rows.findIndex((entry) => entry.id === pinId);
    if (index < 0) continue;
    const next = { ...rows[index]!, item_id: itemId, pin_status: "active" as const };
    const updated = [...rows];
    updated[index] = next;
    store.set(key, updated);
    persistStore();
    return next;
  }
  return null;
}

export function devPlanPinStoreReset(planSheetId?: string) {
  if (planSheetId) store.delete(sheetKey(planSheetId));
  else store.clear();
  persistStore();
}

export function installDevPlanPinFetchMock(
  sessionId: string,
  projectId: string | null,
  planSheetId: string,
) {
  if (typeof window === "undefined") return () => undefined;
  const original = window.fetch.bind(window);
  const win = window as Window & { __devPlanPinCount?: () => number };

  win.__devPlanPinCount = () => devPlanPinStoreCount(planSheetId);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes("/api/site-walk/pins")) return original(input, init);

    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();

    if (method === "POST") {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      const planSheetId = String(body.plan_sheet_id ?? "");
      const clientPinId = String(body.client_pin_id ?? "");
      const pin: DevPinRow = {
        id: globalThis.crypto?.randomUUID?.() ?? `dev-pin-${Date.now()}`,
        org_id: "dev-org",
        project_id: projectId,
        plan_id: null,
        plan_sheet_id: planSheetId,
        session_id: sessionId,
        item_id: (body.item_id as string | null) ?? null,
        x_pct: Number(body.x_pct),
        y_pct: Number(body.y_pct),
        pin_number: Number(body.pin_number ?? 1),
        pin_color: "green",
        pin_status: "draft",
        label: null,
        client_pin_id: clientPinId,
        created_by: "dev-user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        markup_data: {},
      };
      const saved = devPlanPinStoreInsert(pin);
      return new Response(JSON.stringify({ pin: saved }), { status: 201 });
    }

    if (method === "PATCH") {
      const pinId = url.match(/\/api\/site-walk\/pins\/([^/?]+)/)?.[1];
      if (pinId) {
        const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        const saved = devPlanPinStorePatch(pinId, {
          item_id: (body.item_id as string | null) ?? null,
          pin_status: "active",
        });
        if (saved) return new Response(JSON.stringify({ pin: saved }), { status: 200 });
      }
    }

    const parsed = new URL(url, window.location.origin);
    const planSheetId = parsed.searchParams.get("plan_sheet_id");
    if (planSheetId) {
      return new Response(JSON.stringify({ pins: devPlanPinStoreList(planSheetId) }), { status: 200 });
    }
    return original(input, init);
  };

  return () => {
    window.fetch = original;
  };
}

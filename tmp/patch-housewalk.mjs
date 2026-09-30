import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" };

const walkId = "7e0575a3-5d55-45d8-807f-9fb959ce2c21";
const clipId = "f278d37f-1c2f-4511-aef5-437b3992d39d";
const before = await (await fetch(`${url}/rest/v1/spatial_walkthroughs?id=eq.${walkId}&select=id,title,building,operator_patch`, { headers })).json();
const row = before[0];
console.log("before", { title: row?.title, building: row?.building, patch: row?.operator_patch });
if (row?.title !== "HouseWalk X4 live smoke" || row?.building !== "HouseWalk") {
  throw new Error("refusing to patch: not HouseWalk");
}

const operatorPatch = {
  enabled: true,
  nadirRadius: 0.4,
  nadirVerticalExtent: 0.36,
  rearYawCenter: -180,
  rearYawWidth: 110,
  pitchMin: -88,
  pitchMax: 4,
  style: "solid",
  fill: "neutral",
  logoInPatch: true,
  showDate: true,
  showCompass: false,
  headingDeg: null,
  tStart: null,
  tEnd: null,
  keyframes: [
    { t: 0, yawCenter: -180, yawWidth: 96, pitchTop: -4, pitchBottom: -88, nadirRadius: 0.38, feather: 0.08, style: "solid" },
    { t: 10, yawCenter: -176, yawWidth: 108, pitchTop: -2, pitchBottom: -88, nadirRadius: 0.4, feather: 0.1, style: "solid" },
    { t: 18, yawCenter: -180, yawWidth: 132, pitchTop: 8, pitchBottom: -88, nadirRadius: 0.44, feather: 0.12, style: "solid" },
    { t: 28, yawCenter: -168, yawWidth: 140, pitchTop: 10, pitchBottom: -88, nadirRadius: 0.46, feather: 0.12, style: "solid" },
    { t: 38, yawCenter: -172, yawWidth: 118, pitchTop: 2, pitchBottom: -88, nadirRadius: 0.4, feather: 0.1, style: "solid" },
    { t: 51, yawCenter: -180, yawWidth: 110, pitchTop: -2, pitchBottom: -88, nadirRadius: 0.4, feather: 0.08, style: "solid" },
  ],
};

const wt = await fetch(`${url}/rest/v1/spatial_walkthroughs?id=eq.${walkId}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ operator_patch: operatorPatch }),
});
console.log("walk patch", wt.status);
const cl = await fetch(`${url}/rest/v1/spatial_clips?id=eq.${clipId}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ operator_patch: operatorPatch }),
});
console.log("clip patch", cl.status);
const after = await (await fetch(`${url}/rest/v1/spatial_walkthroughs?id=eq.${walkId}&select=title,operator_patch`, { headers })).json();
console.log("after width", after[0]?.operator_patch?.rearYawWidth, "keys", after[0]?.operator_patch?.keyframes?.length);

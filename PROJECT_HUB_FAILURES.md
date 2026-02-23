# PROJECT_HUB_FAILURES

## TASK 1: THE CREATION & PROVISIONING CRASH

### 1) Exact code block in `app/api/projects/create/route.ts` where `/api/slatedrop/provision` is called

```ts
  const provisionResponse = await fetch(`${req.nextUrl.origin}/api/slatedrop/provision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({
      projectId: createdProject.id,
      projectName: createdProject.name,
    }),
  });

  if (!provisionResponse.ok) {
    await admin.from("project_members").delete().eq("project_id", createdProject.id).eq("user_id", user.id);
    await admin.from("projects").delete().eq("id", createdProject.id).eq("org_id", orgId);

    const provisionPayload = await provisionResponse.json().catch(() => ({}));
    console.error("[api/projects/create] folder provisioning failed", provisionPayload);

    return NextResponse.json(
      { error: "Project created but folder provisioning failed. Project was rolled back." },
      { status: 500 }
    );
  }
```

### 2) Exact code in `app/api/slatedrop/provision/route.ts` where folder insert executes

```ts
  const rows = SYSTEM_FOLDERS.map((name) => ({
    name,
    folder_path: `Project Sandbox/${projectName}/${name}`,
    parent_id: projectId,
    is_system: true,
    folder_type: name.toLowerCase().replace(/\s+/g, "_"),
    is_public: false,
    allow_upload: true,
    org_id: orgId,
    created_by: user.id,
  }));

  const { data, error } = await supabase
    .from("project_folders")
    .insert(rows)
    .select("id, name");

  if (error) {
    console.error("[slatedrop/provision]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
```

---

## TASK 2: THE 400/500 FETCH ERRORS

### 1) `GET` function from `app/api/projects/[projectId]/route.ts`

```ts
export async function GET(_req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;
  const { user, admin, orgId } = await getAuthScope();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let query = admin
    .from("projects")
    .select("id, name, description, metadata, status, created_at")
    .eq("id", projectId)
    .limit(1);

  query = orgId ? query.eq("org_id", orgId) : query.eq("created_by", user.id);

  const { data, error } = await query.single();
  if (error || !data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project: data });
}
```

---

## TASK 3: GOOGLE MAPS DEPRECATION

### 1) Imports at top of `CreateProjectWizard.tsx` related to Google Maps

```ts
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
```

### 2) JSX block where `<Map>` and Places-related input area are rendered

```tsx
            {currentStep === 2 && (
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Project Location</p>
                    <p className="text-[11px] text-gray-500">Type an address or click map to set a pin</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600">
                    <MapPin size={11} />
                    {lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "No pin set"}
                  </span>
                </div>

                <div className="mb-3">
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Address</label>
                  <input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Manual address entry or reverse geocoded result"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
                  />
                </div>

                <div className="h-[280px] overflow-hidden rounded-xl border border-gray-200">
                  <APIProvider apiKey={googleMapsApiKey} libraries={["places"]}>
                    <Map
                      defaultCenter={mapCenter}
                      defaultZoom={4}
                      center={mapCenter}
                      onClick={handleMapClick}
                      disableDefaultUI
                      gestureHandling="greedy"
                    >
                      {lat && lng ? <Marker position={{ lat, lng }} /> : null}
                    </Map>
                  </APIProvider>
                </div>
              </div>
            )}
```

---

## TASK 4: HEADER & UI MISMATCH

### 1) Main header `className` in Market UI (`components/dashboard/MarketClient.tsx`)

```tsx
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 px-1">
```

### 2) Main header `className` in `app/(dashboard)/project-hub/page.tsx`

```tsx
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
```

### 3) Hardcoded step numbers/labels in `CreateProjectWizard.tsx`?

**Answer:** Yes

Rendered step label example:

```tsx
<p className="text-xs text-gray-500 mt-1">Step {currentStep} of {totalSteps}</p>
```

Wizard modal wrapper `className`:

```tsx
className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-md"
```

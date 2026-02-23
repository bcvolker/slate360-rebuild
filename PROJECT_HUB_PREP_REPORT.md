# PROJECT_HUB_PREP_REPORT

## Scope
Targeted readiness audit for **Project Hub Wizard Upgrade** and **Mobile Field Tools**, based on current repository dependencies, source usage, and Supabase migrations.

---

## 1) Map Integration

### Dependency check (`package.json`)
- `@googlemaps/react-wrapper`: **Not installed**
- `@vis.gl/react-google-maps`: **Installed** (`^1.7.1`)
- `mapbox-gl`: **Not installed**
- `react-leaflet`: **Not installed**

### Current map implementation
- Map UI is currently implemented with `@vis.gl/react-google-maps` in `components/dashboard/LocationMap.tsx`.

### API key env pattern in codebase
- Google Maps key is read via:
  - `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (used in `components/dashboard/LocationMap.tsx`)
- No tracked `.env*` files are present in this repo, so actual secret values are **not** committed.
- A context doc references `NEXT_PUBLIC_MAPBOX_TOKEN`, but this is documentation/context only, not an active runtime dependency in current source.

---

## 2) Voice & Weather

### Speech recognition dependency
- `react-speech-recognition`: **Not installed**.
- No source usage of `SpeechRecognition`/`webkitSpeechRecognition` was found.

### Weather implementation status
- There is already a working weather fetch flow in `components/dashboard/DashboardClient.tsx` using native `fetch` against:
  - `https://api.open-meteo.com/v1/forecast`
  - `https://geocoding-api.open-meteo.com/v1/reverse`
- No reusable weather utility module (e.g., `lib/weather.ts`) exists at present.

### Recommendation
- For the wizard/mobile scope, continue using **native `fetch` + Open-Meteo** unless centralization is required; if needed, promote current inline logic into a shared utility later.

---

## 3) Database Schema (Projects & Contacts)

### `projects` table metadata support
- In `supabase/migrations/20260223_create_projects.sql`, `public.projects` currently includes:
  - `id, org_id, name, description, status, created_by, created_at`
- `metadata jsonb` column: **Not present**.

### Contacts/profile source for “Project Team” dropdown
- No `contacts` or `profiles` tables are defined in current migrations.
- Source queries are org-membership-driven (e.g., `organization_members`) and do not indicate an existing dedicated contacts/profile table in this repo’s migrations.

### Recommendation
- Add a `metadata jsonb` field to `projects` (or explicit columns) for Wizard fields like **Location, Contract Type, Scope**.
- Define a dedicated source for team dropdown data (new table/view or a join strategy over existing org/user tables).

---

## 4) External Uploads (App Ecosystem #1)

- No `project_external_links` or `slatedrop_links` table exists in current `supabase/migrations/*`.
- `slatedrop_links` appears only in context/planning documents under `slate360-context/`, not in active migration files.

### Recommendation
- Add a migration for secure no-login upload portals (tokenized link table + access log/audit table), then wire API endpoints to that schema.

---

## Readiness Summary
- **Maps:** Ready with current Google Maps stack (`@vis.gl/react-google-maps`).
- **Speech:** Not ready; dependency and integration are missing.
- **Projects metadata:** Not ready; schema extension required.
- **Project team contacts source:** Not ready; no dedicated contacts/profiles schema in current migrations.
- **External no-login upload links:** Not ready; migration/table not present.

---

## Exact npm install command (missing Maps/Speech deps)
`npm install react-speech-recognition`

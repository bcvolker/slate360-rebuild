"use client";

import { APIProvider, AdvancedMarker, Map } from "@vis.gl/react-google-maps";
import { IconMapPin, IconPentagon, IconSearch, IconX } from "@tabler/icons-react";
import { useHomeLocationPicker, type HomeLocationValue } from "./useHomeLocationPicker";

/**
 * Public contact-form location picker — new light chrome (search bar,
 * full-word labels, ≥48px targets, gestureHandling: cooperative so it
 * never traps page scroll). See docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md
 * §4.2 for why this is new chrome over reused logic, not a reused component.
 */
export function HomeLocationPicker({ value, onChange }: { value: HomeLocationValue; onChange: (v: HomeLocationValue) => void }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

  if (!apiKey) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)] px-4 text-center text-sm text-[var(--mkt-ink-muted)]">
        Map unavailable right now — you can still describe the location below.
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["places", "geocoding"]}>
      <div className="relative h-72 overflow-hidden rounded-xl border border-[var(--mkt-line)] sm:h-80">
        <Map
          id="home-loc-map"
          mapId={mapId}
          defaultCenter={{ lat: value.lat ?? 33.4484, lng: value.lng ?? -112.074 }}
          defaultZoom={value.lat !== null ? 17 : 9}
          mapTypeId="satellite"
          tilt={45}
          disableDefaultUI
          gestureHandling="cooperative"
          style={{ width: "100%", height: "100%" }}
        >
          {value.lat !== null && value.lng !== null && <AdvancedMarker position={{ lat: value.lat, lng: value.lng }} />}
        </Map>
        <HomeLocationPickerChrome value={value} onChange={onChange} />
      </div>
    </APIProvider>
  );
}

function HomeLocationPickerChrome({ value, onChange }: { value: HomeLocationValue; onChange: (v: HomeLocationValue) => void }) {
  const {
    input, setInput, suggestions, resolving, tool, mapType, setMapType,
    drawingVertices, isDrawingBoundary, activateTool, clearLocation, finishBoundary, selectSuggestion,
  } = useHomeLocationPicker(value, onChange);

  const modeBtn = (active: boolean) =>
    `h-11 min-w-[48px] rounded-lg px-3 text-[13px] font-semibold transition-colors ${
      active ? "bg-[var(--mkt-accent)] text-white" : "bg-white/90 text-[var(--mkt-ink-muted)] hover:text-[var(--mkt-ink)]"
    }`;

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="pointer-events-auto absolute left-2 right-2 top-2">
        <div className="relative flex items-center gap-1.5 rounded-xl border border-[var(--mkt-line)] bg-white/95 p-1.5 shadow-md backdrop-blur-sm">
          <IconSearch size={17} className="ml-1.5 shrink-0 text-[var(--mkt-ink-muted)]" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search an address, or tap the map"
            className="h-9 flex-1 bg-transparent text-[15px] text-[var(--mkt-ink)] outline-none placeholder:text-[var(--mkt-ink-muted)]"
          />
          {value.lat !== null || input ? (
            <button
              type="button"
              onClick={clearLocation}
              aria-label="Clear the selected location"
              title="Clear the selected location"
              className="mr-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--mkt-ink-muted)] hover:bg-[var(--mkt-canvas-alt)] hover:text-[var(--mkt-ink)]"
            >
              <IconX size={17} />
            </button>
          ) : null}
          {suggestions.length > 0 ? (
            <ul className="absolute left-0 right-0 top-full z-10 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-[var(--mkt-line)] bg-white shadow-lg">
              {suggestions.map((s) => (
                <li key={s.placeId || s.description}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); void selectSuggestion(s); }}
                    className="flex w-full items-start gap-2 px-3.5 py-3 text-left text-[14px] text-[var(--mkt-ink)] hover:bg-[var(--mkt-canvas-alt)]"
                  >
                    <IconMapPin size={15} className="mt-0.5 shrink-0 text-[var(--mkt-accent)]" />
                    {s.description}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {resolving ? <span className="mr-1.5 text-[11px] text-[var(--mkt-ink-muted)]">Searching…</span> : null}
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-2 left-2 flex flex-wrap items-center gap-1.5">
        <div className="flex gap-1 rounded-xl border border-[var(--mkt-line)] bg-white/95 p-1 shadow-md backdrop-blur-sm">
          <button type="button" onClick={() => (isDrawingBoundary ? finishBoundary() : activateTool("polygondraw"))} className={modeBtn(tool === "polygondraw")} title="Outline the project area">
            <IconPentagon size={17} className="mx-auto" />
          </button>
          {isDrawingBoundary ? (
            <button type="button" onClick={() => activateTool("select")} className={modeBtn(false)} title="Cancel">
              <IconX size={17} className="mx-auto" />
            </button>
          ) : null}
        </div>
        <div className="flex gap-1 rounded-xl border border-[var(--mkt-line)] bg-white/95 p-1 shadow-md backdrop-blur-sm">
          <button type="button" onClick={() => setMapType("satellite")} className={modeBtn(mapType === "satellite")}>Satellite</button>
          <button type="button" onClick={() => setMapType("roadmap")} className={modeBtn(mapType === "roadmap")}>Map</button>
        </div>
      </div>

      {isDrawingBoundary ? (
        <div className="pointer-events-none absolute left-2 right-2 top-16 flex justify-center">
          <div className="rounded-lg bg-white/95 px-3 py-2 text-center text-[12.5px] font-medium text-[var(--mkt-ink)] shadow-md">
            {drawingVertices.length < 3
              ? `Tap the map to mark corners (${drawingVertices.length} so far — need at least 3)`
              : `${drawingVertices.length} points — tap the outline button again to finish`}
          </div>
        </div>
      ) : null}

      {value.address ? (
        <div className="pointer-events-auto absolute bottom-2 right-2 flex max-w-[70%] items-center gap-1.5 rounded-lg bg-white/95 py-1.5 pl-2.5 pr-1.5 text-[11.5px] text-[var(--mkt-ink)] shadow-md">
          <span className="truncate">{value.address}</span>
          <button
            type="button"
            onClick={clearLocation}
            aria-label="Clear this location"
            title="Clear this location"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--mkt-ink-muted)] hover:bg-[var(--mkt-canvas-alt)] hover:text-[var(--mkt-ink)]"
          >
            <IconX size={13} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

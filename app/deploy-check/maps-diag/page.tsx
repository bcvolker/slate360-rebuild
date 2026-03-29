"use client";

import { useState, useEffect, useCallback } from "react";
import { APIProvider, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Map } from "@vis.gl/react-google-maps";

function DiagInner() {
  const map = useMap("diag-map");
  const placesLib = useMapsLibrary("places");
  const geocodingLib = useMapsLibrary("geocoding");
  const [logs, setLogs] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [results, setResults] = useState<string[]>([]);

  const log = useCallback((msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toISOString().slice(11, 23)}] ${msg}`]);
  }, []);

  useEffect(() => {
    log(`placesLib: ${placesLib ? "LOADED" : "null"}`);
    if (placesLib) {
      const keys = Object.keys(placesLib).sort();
      log(`placesLib keys (${keys.length}): ${keys.slice(0, 15).join(", ")}${keys.length > 15 ? "..." : ""}`);
      log(`placesLib.AutocompleteSuggestion: ${(placesLib as any).AutocompleteSuggestion ? "EXISTS" : "MISSING"}`);
      log(`placesLib.AutocompleteService: ${(placesLib as any).AutocompleteService ? "EXISTS" : "MISSING"}`);
      log(`placesLib.Place: ${(placesLib as any).Place ? "EXISTS" : "MISSING"}`);
    }
    // Also check window global
    const g = (window as any).google?.maps?.places;
    log(`window.google.maps.places: ${g ? "EXISTS" : "MISSING"}`);
    if (g) {
      log(`window...AutocompleteSuggestion: ${g.AutocompleteSuggestion ? "EXISTS" : "MISSING"}`);
    }
  }, [placesLib, log]);

  useEffect(() => {
    log(`geocodingLib: ${geocodingLib ? "LOADED" : "null"}`);
  }, [geocodingLib, log]);

  useEffect(() => {
    log(`map: ${map ? "READY" : "null"}`);
  }, [map, log]);

  const testAutocomplete = async () => {
    if (!input.trim()) { log("ERROR: empty input"); return; }

    // Method 1: placesLib direct
    log(`--- Testing input: "${input}" ---`);
    const Autocomplete = (placesLib as any)?.AutocompleteSuggestion;
    if (Autocomplete) {
      log("Method 1: Using placesLib.AutocompleteSuggestion...");
      try {
        const response = await Autocomplete.fetchAutocompleteSuggestions({ input: input.trim() });
        const suggestions = response?.suggestions ?? [];
        log(`Method 1 SUCCESS: ${suggestions.length} suggestions`);
        setResults(suggestions.map((s: any) =>
          s.placePrediction?.text?.text ?? s.placePrediction?.text ?? "???"
        ));
      } catch (e: any) {
        log(`Method 1 ERROR: ${e?.message ?? e}`);
      }
    } else {
      log("Method 1 SKIP: AutocompleteSuggestion not on placesLib");
    }

    // Method 2: window global
    const g = (window as any).google?.maps?.places;
    if (g?.AutocompleteSuggestion) {
      log("Method 2: Using window.google.maps.places.AutocompleteSuggestion...");
      try {
        const response = await g.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: input.trim() });
        const suggestions = response?.suggestions ?? [];
        log(`Method 2 SUCCESS: ${suggestions.length} suggestions`);
        if (results.length === 0) {
          setResults(suggestions.map((s: any) =>
            s.placePrediction?.text?.text ?? s.placePrediction?.text ?? "???"
          ));
        }
      } catch (e: any) {
        log(`Method 2 ERROR: ${e?.message ?? e}`);
      }
    } else {
      log("Method 2 SKIP: AutocompleteSuggestion not on window global");
    }

    // Method 3: AutocompleteService (legacy)
    if ((placesLib as any)?.AutocompleteService) {
      log("Method 3: Using AutocompleteService (legacy)...");
      try {
        const service = new (placesLib as any).AutocompleteService();
        service.getPlacePredictions({ input: input.trim() }, (predictions: any, status: any) => {
          log(`Method 3 callback: status=${status}, predictions=${predictions?.length ?? 0}`);
          if (predictions && results.length === 0) {
            setResults(predictions.map((p: any) => p.description));
          }
        });
      } catch (e: any) {
        log(`Method 3 ERROR: ${e?.message ?? e}`);
      }
    } else {
      log("Method 3 SKIP: AutocompleteService not available");
    }

    // Method 4: Geocoder fallback
    if (geocodingLib) {
      log("Method 4: Using Geocoder (fallback)...");
      try {
        const geocoder = new geocodingLib.Geocoder();
        const res = await geocoder.geocode({ address: input.trim() });
        log(`Method 4 SUCCESS: ${res.results.length} results`);
        if (results.length === 0) {
          setResults(res.results.map((r) => r.formatted_address));
        }
      } catch (e: any) {
        log(`Method 4 ERROR: ${e?.message ?? e}`);
      }
    } else {
      log("Method 4 SKIP: geocodingLib not loaded");
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Maps Autocomplete Diagnostic</h1>
      <p className="text-sm text-gray-500">
        API Key: {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "SET (" + process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.slice(0, 8) + "...)" : "MISSING"}
      </p>

      <div className="h-48 w-full rounded border overflow-hidden">
        <Map id="diag-map" defaultCenter={{ lat: 39.5, lng: -98.35 }} defaultZoom={4}
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"}
          disableDefaultUI style={{ width: "100%", height: "100%" }} />
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type an address..."
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button onClick={testAutocomplete}
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium">
          Test
        </button>
      </div>

      {results.length > 0 && (
        <div className="border rounded p-2 space-y-1">
          <p className="text-xs font-semibold text-green-600">Results:</p>
          {results.map((r, i) => <p key={i} className="text-sm">{r}</p>)}
        </div>
      )}

      <div className="bg-gray-900 text-green-400 rounded p-3 text-xs font-mono max-h-96 overflow-y-auto whitespace-pre-wrap">
        {logs.length === 0 ? "Waiting for libraries to load..." : logs.join("\n")}
      </div>
    </div>
  );
}

export default function MapsDiagPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  if (!apiKey) {
    return <div className="p-8 text-red-600 font-bold">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set</div>;
  }
  return (
    <APIProvider apiKey={apiKey} libraries={["places", "geocoding"]}>
      <DiagInner />
    </APIProvider>
  );
}

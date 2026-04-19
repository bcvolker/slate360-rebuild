"use client";

import {
  CheckCircle2,
  Eraser,
  Loader2,
  MapPin,
  MousePointer2,
  Pentagon,
  Search,
  X,
} from "lucide-react";
import type { LocationPickerValue } from "./WizardLocationPicker";
import { useWizardLocationPickerController } from "./useWizardLocationPickerController";

interface WizardLocationPickerControllerProps {
  value: LocationPickerValue;
  onChange: (value: LocationPickerValue) => void;
}

export default function WizardLocationPickerController({
  value,
  onChange,
}: WizardLocationPickerControllerProps) {
  const {
    input,
    suggestions,
    resolving,
    tool,
    mapType,
    isThreeD,
    drawingVertices,
    isDrawingPolygon,
    setInput,
    setSuggestions,
    setMapType,
    setIsThreeD,
    activateTool,
    clearPreview,
    clearBoundary,
    finishPolygon,
    selectSuggestion,
    searchAddress,
  } = useWizardLocationPickerController({ value, onChange });

  const buttonClassName = (active: boolean) =>
    `px-2 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
      active
        ? "bg-[#F59E0B] text-white"
        : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
    }`;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-2 left-2 right-2 z-10 pointer-events-auto">
        <div className="flex gap-1.5 bg-white rounded-xl shadow-md border border-gray-200 p-1.5">
          <div className="relative flex-1">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.stopPropagation();
                  void searchAddress();
                }
                if (event.key === "Escape") setSuggestions([]);
              }}
              placeholder="Search address or coordinates…"
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/20 focus:outline-none"
            />
            {resolving && (
              <Loader2
                size={12}
                className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
              />
            )}
            {suggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-20 max-h-52 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <li
                    key={suggestion.placeId}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      void selectSuggestion(suggestion);
                    }}
                    className="px-3 py-2 text-xs hover:bg-amber-50 cursor-pointer flex items-start gap-2"
                  >
                    <MapPin size={11} className="text-[#F59E0B] mt-0.5 shrink-0" />
                    {suggestion.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => void searchAddress()}
            className="px-2.5 py-1.5 bg-[#F59E0B] hover:bg-[#E64500] rounded-lg text-white transition-colors"
          >
            <Search size={14} />
          </button>
        </div>
      </div>

      <div className="absolute bottom-2 left-2 z-10 pointer-events-auto flex gap-1.5 flex-wrap">
        <div className="flex gap-0.5 bg-white rounded-xl border border-gray-200 shadow p-1">
          <button type="button" onClick={() => activateTool("select")} title="Select/Pan" className={buttonClassName(!isDrawingPolygon && tool === "select")}><MousePointer2 size={13} /></button>
          <button type="button" onClick={() => activateTool("marker")} title="Drop pin" className={buttonClassName(tool === "marker")}><MapPin size={13} /></button>
          <button
            type="button"
            onClick={() => (isDrawingPolygon ? finishPolygon() : activateTool("polygon"))}
            title={isDrawingPolygon ? `Finish boundary (${drawingVertices.length} pts)` : "Draw site boundary"}
            className={buttonClassName(tool === "polygon")}
          >
            <Pentagon size={13} />
            {isDrawingPolygon && drawingVertices.length >= 3 && <CheckCircle2 size={10} className="text-green-400" />}
          </button>
          {isDrawingPolygon && <button type="button" onClick={clearPreview} title="Cancel drawing" className={buttonClassName(false)}><X size={13} /></button>}
          {!isDrawingPolygon && value.boundary.length > 0 && <button type="button" onClick={clearBoundary} title="Clear boundary" className={buttonClassName(false)}><Eraser size={13} /></button>}
        </div>

        <div className="flex gap-0.5 bg-white rounded-xl border border-gray-200 shadow p-1">
          <button type="button" onClick={() => setMapType("roadmap")} className={buttonClassName(mapType === "roadmap")}>Map</button>
          <button type="button" onClick={() => setMapType("satellite")} className={buttonClassName(mapType === "satellite")}>Sat</button>
          <button type="button" onClick={() => setMapType("hybrid")} className={buttonClassName(mapType === "hybrid")}>Hyb</button>
        </div>

        <div className="flex gap-0.5 bg-white rounded-xl border border-gray-200 shadow p-1">
          <button type="button" onClick={() => setIsThreeD(false)} className={buttonClassName(!isThreeD)}>2D</button>
          <button type="button" onClick={() => setIsThreeD(true)} className={buttonClassName(isThreeD)}>3D</button>
        </div>
      </div>

      {isDrawingPolygon && (
        <div className="absolute top-14 left-2 right-2 z-10 pointer-events-none">
          <div className="bg-app-card/95 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[11px] text-white font-semibold text-center">
            {drawingVertices.length < 3
              ? `Click map to add vertices (${drawingVertices.length} so far, need 3 min)`
              : `${drawingVertices.length} pts — click ⧆ again to close boundary`}
          </div>
        </div>
      )}

      {value.lat !== null && value.lng !== null && (
        <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-gray-600 border border-gray-200 shadow flex items-center gap-1">
            <MapPin size={9} className="text-[#F59E0B]" />
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </div>
        </div>
      )}

      {!isDrawingPolygon && value.boundary.length > 0 && (
        <div className="absolute top-14 right-2 z-10 pointer-events-none">
          <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg px-2 py-1 text-[10px] text-[#F59E0B] font-semibold">
            Boundary: {value.boundary.length} pts
          </div>
        </div>
      )}
    </div>
  );
}
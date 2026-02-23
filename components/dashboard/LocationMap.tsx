"use client";

import { useState, useRef } from "react";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { MapPin, Download, PenTool, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type LocationMapProps = {
  center?: { lat: number; lng: number };
  locationLabel?: string;
};

export default function LocationMap({ center, locationLabel }: LocationMapProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const defaultCenter = center ?? { lat: 40.7128, lng: -74.0060 };

  const handleDownloadPDF = async () => {
    if (!mapRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(mapRef.current, { useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save("site-location.pdf");
    } catch (error) {
      console.error("Failed to generate PDF", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <MapPin size={16} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Site Location</h3>
            <p className="text-[10px] text-gray-500">{locationLabel ?? "Interactive Map & Markup"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors" title="Markup">
            <PenTool size={14} />
          </button>
          <button 
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50" 
            title="Download PDF"
          >
            {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          </button>
        </div>
      </div>
      
      <div className="flex-1 relative min-h-[250px]" ref={mapRef}>
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
          <Map
            defaultZoom={13}
            defaultCenter={defaultCenter}
            gestureHandling={"greedy"}
            disableDefaultUI={true}
          >
            <Marker position={defaultCenter} />
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}

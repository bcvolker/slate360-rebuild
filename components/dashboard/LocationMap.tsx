"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { CheckCircle2, Copy, Download, Loader2, MapPin, PenTool, Save, Send, Trash2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type LocationMapProps = {
  center?: { lat: number; lng: number };
  locationLabel?: string;
};

type ProjectOption = {
  id: string;
  name: string;
};

type FolderOption = {
  id: string;
  name: string;
  path: string;
};

export default function LocationMap({ center, locationLabel }: LocationMapProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [markupMode, setMarkupMode] = useState(false);
  const [markers, setMarkers] = useState<Array<{ id: string; lat: number; lng: number }>>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [lastFileId, setLastFileId] = useState<string | null>(null);
  const [lastShareUrl, setLastShareUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const defaultCenter = center ?? { lat: 40.7128, lng: -74.0060 };

  const selectedFolder = useMemo(
    () => folders.find((folder) => folder.id === selectedFolderId) ?? null,
    [folders, selectedFolderId]
  );

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      try {
        const res = await fetch("/api/dashboard/widgets", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data?.projects)) {
          return;
        }

        if (cancelled) return;
        const normalized = (data.projects as Array<{ id: string; name: string }>).map((project) => ({
          id: project.id,
          name: project.name,
        }));
        setProjects(normalized);
        if (normalized.length > 0) {
          setSelectedProjectId((prev) => prev || normalized[0].id);
        }
      } catch {
        // silently ignore dashboard data load failures
      }
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFolders = async () => {
      if (!selectedProjectId) {
        setFolders([]);
        setSelectedFolderId("");
        return;
      }

      try {
        const res = await fetch(`/api/slatedrop/project-folders?projectId=${encodeURIComponent(selectedProjectId)}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data?.folders)) {
          if (!cancelled) {
            setFolders([]);
            setSelectedFolderId("");
          }
          return;
        }

        if (cancelled) return;
        const normalized = (data.folders as FolderOption[]).map((folder) => ({
          id: folder.id,
          name: folder.name,
          path: folder.path,
        }));
        setFolders(normalized);
        setSelectedFolderId((prev) => {
          if (prev && normalized.some((folder) => folder.id === prev)) return prev;
          return normalized[0]?.id ?? "";
        });
      } catch {
        if (!cancelled) {
          setFolders([]);
          setSelectedFolderId("");
        }
      }
    };

    void loadFolders();

    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const createPdfBlob = async () => {
    if (!mapRef.current) throw new Error("Map is not ready");

    const canvas = await html2canvas(mapRef.current, {
      useCORS: true,
      scale: 2,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

    const sanitized = (locationLabel ?? "site-location")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "site-location";

    return {
      blob: pdf.output("blob") as Blob,
      filename: `${sanitized}-${new Date().toISOString().slice(0, 10)}.pdf`,
    };
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    setStatus(null);
    try {
      const { blob, filename } = await createPdfBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus({ ok: true, text: "Map exported to PDF." });
    } catch (error) {
      console.error("Failed to generate PDF", error);
      setStatus({ ok: false, text: "Failed to export PDF." });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveToFolder = async () => {
    if (!selectedProjectId || !selectedFolderId || !selectedFolder) {
      setStatus({ ok: false, text: "Choose a project folder first." });
      return;
    }

    setIsSaving(true);
    setStatus(null);

    try {
      const { blob, filename } = await createPdfBlob();

      const urlRes = await fetch("/api/slatedrop/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          contentType: "application/pdf",
          size: blob.size,
          folderId: selectedFolderId,
          folderPath: selectedFolder.path,
        }),
      });

      const urlData = await urlRes.json().catch(() => ({}));
      if (!urlRes.ok || !urlData?.uploadUrl || !urlData?.fileId) {
        throw new Error(urlData?.error ?? "Failed to reserve upload");
      }

      const putRes = await fetch(urlData.uploadUrl as string, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: blob,
      });
      if (!putRes.ok) {
        throw new Error("Upload failed");
      }

      const completeRes = await fetch("/api/slatedrop/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: urlData.fileId as string }),
      });
      if (!completeRes.ok) {
        throw new Error("Upload finalization failed");
      }

      setLastFileId(urlData.fileId as string);
      setStatus({ ok: true, text: `Saved to ${selectedFolder.name}.` });
    } catch (error) {
      console.error("Failed to save map PDF", error);
      setStatus({ ok: false, text: "Could not save map to SlateDrop." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendShareLink = async () => {
    if (!recipientEmail.trim()) {
      setStatus({ ok: false, text: "Recipient email is required." });
      return;
    }
    if (!lastFileId) {
      setStatus({ ok: false, text: "Save the map to a project folder first." });
      return;
    }

    setIsSharing(true);
    setStatus(null);

    try {
      const res = await fetch("/api/slatedrop/secure-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: lastFileId,
          email: recipientEmail.trim(),
          permission: "download",
          expiryDays: 7,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.shareUrl) {
        throw new Error(data?.error ?? "Failed to generate share link");
      }

      setLastShareUrl(data.shareUrl as string);
      setStatus({ ok: true, text: "Secure link sent and ready to copy." });
    } catch (error) {
      console.error("Failed to send secure link", error);
      setStatus({ ok: false, text: "Could not send secure link." });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!lastShareUrl) return;
    try {
      await navigator.clipboard.writeText(lastShareUrl);
      setStatus({ ok: true, text: "Share link copied." });
    } catch {
      setStatus({ ok: false, text: "Could not copy share link." });
    }
  };

  const handleMapClick = (event: unknown) => {
    if (!markupMode) return;
    const detail = (event as { detail?: { latLng?: { lat?: number | (() => number); lng?: number | (() => number) } } })?.detail;
    const latValue = detail?.latLng?.lat;
    const lngValue = detail?.latLng?.lng;

    const lat = typeof latValue === "function" ? latValue() : latValue;
    const lng = typeof lngValue === "function" ? lngValue() : lngValue;

    if (typeof lat !== "number" || typeof lng !== "number") return;

    setMarkers((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, lat, lng }]);
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
          <button
            onClick={() => setMarkupMode((prev) => !prev)}
            className={`p-1.5 rounded-lg transition-colors ${markupMode ? "text-[#FF4D00] bg-[#FF4D00]/10" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
            title={markupMode ? "Disable markup" : "Enable markup"}
          >
            <PenTool size={14} />
          </button>
          <button
            onClick={() => setMarkers([])}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Clear markup"
          >
            <Trash2 size={14} />
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

      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700"
          >
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <select
            value={selectedFolderId}
            onChange={(event) => setSelectedFolderId(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700"
            disabled={!selectedProjectId || folders.length === 0}
          >
            <option value="">Select folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <input
            type="email"
            placeholder="recipient@email.com"
            value={recipientEmail}
            onChange={(event) => setRecipientEmail(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToFolder}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
            </button>
            <button
              onClick={handleSendShareLink}
              disabled={isSharing}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#FF4D00" }}
            >
              {isSharing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send Link
            </button>
            <button
              onClick={handleCopyShareLink}
              disabled={!lastShareUrl}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
              title="Copy last generated link"
            >
              <Copy size={12} /> Copy
            </button>
          </div>
        </div>

        <p className="text-[10px] text-gray-500">
          {markupMode ? "Markup enabled: click the map to drop markers." : "Enable markup to add markers, then save to a project folder."}
        </p>
        {status && (
          <p className={`text-[10px] flex items-center gap-1 ${status.ok ? "text-emerald-600" : "text-red-600"}`}>
            {status.ok ? <CheckCircle2 size={11} /> : null}
            {status.text}
          </p>
        )}
      </div>
      
      <div className="flex-1 relative min-h-[220px]" ref={mapRef}>
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
          <Map
            defaultZoom={13}
            defaultCenter={defaultCenter}
            gestureHandling={"greedy"}
            disableDefaultUI={true}
            onClick={handleMapClick}
          >
            <Marker position={defaultCenter} />
            {markers.map((marker) => (
              <Marker key={marker.id} position={{ lat: marker.lat, lng: marker.lng }} />
            ))}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Camera, UploadCloud, FileWarning, Loader2 } from "lucide-react";

export function SceneUploader({ 
  tourId, 
  onUploadSuccess 
}: { 
  tourId: string;
  onUploadSuccess: (scene: any) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProgress(0);
    setErrorMsg(null);

    try {
      // Step 1: Request Presigned URL from our API
      const res = await fetch(`/api/tours/${tourId}/scenes/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.format_rejected) {
          setErrorMsg(data.error);
        } else {
          setErrorMsg(data.error || "Failed to initiate upload.");
        }
        setIsUploading(false);
        return;
      }

      // Step 2: Upload directly to S3 using XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", data.uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error("S3 Upload Failed"));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      // Step 3: Success! The API already created the DB row, so we just pass it back to the UI
      onUploadSuccess(data.scene);
      setIsUploading(false);
      setProgress(0);

    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMsg(err.message || "An unexpected error occurred.");
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Mobile-Friendly Tap-To-Upload Button */}
      <div className="relative w-full max-w-sm">
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileChange}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
        />
        <div className={`
          flex items-center justify-center gap-3 w-full h-16 rounded-xl border-2 border-dashed
          transition-all duration-200
          ${isUploading ? 'bg-app-card border-app' : 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50'}
        `}>
          {isUploading ? (
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-amber-500" />
          )}
          <span className="font-semibold text-white">
            {isUploading ? "Uploading..." : "Add Scene"}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="w-full max-w-sm mt-4 bg-app-card rounded-full h-2 overflow-hidden border border-app">
          <div 
            className="bg-amber-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Error Message (Format Rejections / Quota) */}
      {errorMsg && (
        <div className="w-full max-w-sm mt-4 flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <FileWarning className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400 leading-relaxed">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}

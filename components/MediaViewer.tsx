'use client';
import { useState } from 'react';
import Modal from './ui/Modal';

type MediaType = 'image' | 'video' | 'model' | 'tour';

interface Media {
  type: MediaType;
  src: string;         // local /public or remote URL
  poster?: string;     // for video
  alt?: string;        // for image
}

export default function MediaViewer({ media, label }: { media: Media; label: string }) {
  const [open, setOpen] = useState(false);

  const box = (
    <div className="group relative aspect-video w-full overflow-hidden rounded-xl border bg-slate-50">
      {/* IMAGE */}
      {media.type === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.src} alt={media.alt || label} className="h-full w-full object-cover" />
      )}
      {/* VIDEO */}
      {media.type === 'video' && (
        <video
          className="h-full w-full object-cover"
          src={media.src}
          poster={media.poster}
          controls
          playsInline
        />
      )}
      {/* MODEL / TOUR placeholders */}
      {media.type === 'model' && (
        <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
          3D Model Viewer (coming from CEO uploads) — placeholder
        </div>
      )}
      {media.type === 'tour' && (
        <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
          360° Tour Viewer — placeholder
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        className="absolute right-3 top-3 rounded-md bg-white/90 px-3 py-1 text-xs shadow-sm hover:bg-white"
      >
        Expand
      </button>
    </div>
  );

  return (
    <>
      {box}
      <Modal open={open} onClose={() => setOpen(false)} label={`${label} Viewer`}>
        <div className="aspect-video w-full">
          {media.type === 'image' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.src} alt={media.alt || label} className="h-full w-full object-contain" />
          )}
          {media.type === 'video' && (
            <video className="h-full w-full" src={media.src} poster={media.poster} controls playsInline />
          )}
          {media.type === 'model' && (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
              Large 3D Model Viewer (placeholder)
            </div>
          )}
          {media.type === 'tour' && (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
              Large 360° Tour Viewer (placeholder)
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

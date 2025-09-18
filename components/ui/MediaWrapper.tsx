
'use client';
import React, { useRef } from 'react';
import clsx from 'clsx';

type MediaWrapperProps = { type?: 'image' | 'video' | 'iframe' | 'custom'; src?: string; alt?: string; children?: React.ReactNode; };

export default function MediaWrapper({ type = "custom", src, alt = "", children }: MediaWrapperProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hasContent = src || children;

  const ViewerContent = () => {
    if (!hasContent) return null;
    if (type === "image") return <img src={src} alt={alt} className="w-full h-full object-contain" loading="lazy" />;
    if (type === "video") return <video src={src} className="w-full h-full object-contain" controls autoPlay playsInline />;
    if (type === "iframe") return <iframe src={src} className="w-full h-full border-0" allowFullScreen></iframe>;
    return <>{children}</>;
  };
  
  return (
    <>
      <div
        onClick={() => hasContent && dialogRef.current?.showModal()}
        className={clsx(
          "w-full max-w-lg aspect-video rounded-2xl overflow-hidden shadow-lg bg-black/50 flex items-center justify-center border border-white/10",
          hasContent && "cursor-pointer hover:scale-105 transition-transform duration-300"
        )}
      >
        {hasContent ? (
          <div className="w-full h-full relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            {type === 'image' && <img src={src} alt={alt} className="w-full h-full object-cover"/>}
            {type === 'video' && <video src={src} className="w-full h-full object-cover" muted loop playsInline autoPlay />}
            {type === 'custom' && children}
            {type === 'iframe' && <div className="w-full h-full bg-[var(--color-brand-gray)] flex items-center justify-center text-white p-4 text-center">Interactive Viewer Placeholder</div>}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-white font-bold text-sm md:text-base">Click to Expand</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Content Coming Soon</p>
        )}
      </div>

      <dialog ref={dialogRef} className="w-full h-full max-w-none max-h-none bg-black/80 backdrop-blur-md p-4">
        <div className="w-full h-full relative">
          <ViewerContent />
          <button onClick={() => dialogRef.current?.close()} className="absolute top-4 right-4 bg-white text-black w-8 h-8 rounded-full font-bold text-lg">&times;</button>
        </div>
      </dialog>
    </>
  );
}

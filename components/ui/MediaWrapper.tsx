

"use client";
import clsx from 'clsx';
import Image from 'next/image';


type MediaWrapperProps = {
  src?: string;
  alt: string;
  className?: string;
  type?: 'image' | 'video' | 'iframe' | 'custom';
};

export default function MediaWrapper({ src, alt, className, type = 'image' }: MediaWrapperProps) {
  if (type === 'video') {
    return (
      <video
        className={clsx('rounded-lg shadow-lg object-cover', className)}
        src={src}
        autoPlay
        loop
        muted
        playsInline
      />
    );
  }
  if (type === 'iframe' && src) {
    return (
      <iframe
        className={clsx('rounded-lg shadow-lg object-cover w-full h-64', className)}
        src={src}
        title={alt}
        frameBorder="0"
        allowFullScreen
      />
    );
  }
  if (type === 'image' && src) {
    if (src === '/logo.png') {
      // Use Next.js Image for logo.png
      return (
        <Image
          src="/logo.png"
          alt={alt}
          width={120}
          height={40}
          priority
          className={clsx('rounded-lg shadow-lg object-cover', className)}
        />
      );
    }
    return (
      <img
        className={clsx('rounded-lg shadow-lg object-cover', className)}
        src={src}
        alt={alt}
        loading="lazy"
      />
    );
  }
  // For 'custom' or fallback
  return (
    <div className={clsx('rounded-lg shadow-lg object-cover flex items-center justify-center bg-gray-100 dark:bg-gray-800', className)}>
      <span className="text-gray-400">{alt}</span>
    </div>
  );
}

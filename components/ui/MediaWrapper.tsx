
"use client";
import clsx from 'clsx';

type MediaWrapperProps = {
  src: string;
  alt: string;
  className?: string;
  type?: 'image' | 'video';
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
  return (
    <img
      className={clsx('rounded-lg shadow-lg object-cover', className)}
      src={src}
      alt={alt}
      loading="lazy"
    />
  );
}

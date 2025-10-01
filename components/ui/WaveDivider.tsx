import React from "react";

export default function WaveDivider() {
  return (
    <div className="w-full overflow-hidden" aria-hidden="true">
      <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-16 md:h-20">
        <path
          d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z"
          fill="url(#waveGradient)"
        />
        <defs>
          <linearGradient id="waveGradient" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B87333" stopOpacity="0.18" />
            <stop offset="1" stopColor="#4B9CD3" stopOpacity="0.18" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

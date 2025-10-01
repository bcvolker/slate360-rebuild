import React from "react";

export default function WaveDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div className={`w-full overflow-hidden ${flip ? "rotate-180" : ""}`}>
      <svg className="w-full h-16 md:h-24" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 1200 120">
        <path d="M321.39 56.39c58.3-4.2 114.62-13.1 172.34-22.36C597.3 20.4 675.9 2.8 754.88 0c60.6-2.3 120.5 8.9 180.28 18.75C1013.53 31.23 1067 44 1120 44c26.67 0 53.33-2.67 80-8v84H0V62.74c106.67 23.8 213.33 30.2 321.39-6.35z" className="fill-slate-950" />
      </svg>
    </div>
  );
}

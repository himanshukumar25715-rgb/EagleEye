import React, { useState } from 'react';

interface EagleEyeLogoProps {
  className?: string;
  size?: number;
}

export const EagleEyeLogo: React.FC<EagleEyeLogoProps> = ({
  className = "w-8 h-8",
  size = 32,
}) => {
  const [imgError, setImgError] = useState(false);

  if (!imgError) {
    return (
      <div
        className={`relative shrink-0 rounded-[10px] overflow-hidden flex items-center justify-center bg-brand-card shadow-[0_0_0_1px_#e6e3dc] ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src="/eagle-eye-logo.png"
          alt="Eagle Eye Logo"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center rounded-[10px] overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-950 shadow-sm shadow-blue-500/20 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* High-tech Surveillance Eagle Eye Vector Emblem */}
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[85%] h-[85%]"
      >
        <defs>
          <linearGradient id="eagleGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="irisRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>

        {/* Eagle Profile / Crest Contour */}
        <path
          d="M6 10 C 10 7, 18 6, 26 10 C 29 11.5, 31 14, 32 17 C 28 17.5, 25 18, 23 20 C 26 21, 28 23.5, 29 26 C 24 24, 20 23.5, 17 24 C 13 25, 9 28, 5 30 C 7 26, 8 22, 7 18 C 6 15, 5 12, 6 10 Z"
          fill="url(#eagleGlow)"
          opacity="0.25"
        />

        {/* Sharp Eagle Brow & Beak */}
        <path
          d="M8 12 C 14 9, 23 9.5, 29 14 C 31 15.5, 33 18, 33.5 19.5 C 30 19, 27 19.8, 24 21.5 C 27.5 23, 29.5 25.5, 30 28 C 25 25, 19 24.5, 14 26 C 9 27.5, 6 30, 4 32 C 6.5 27, 7 21, 5 16 C 6 14.5, 7 13, 8 12 Z"
          stroke="#ffffff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Surveillance Aperture Ring (Target Reticle) */}
        <circle
          cx="17"
          cy="18"
          r="6.5"
          stroke="url(#irisRing)"
          strokeWidth="1.4"
          strokeDasharray="2 1.5"
        />

        {/* Inner Iris Pupil with Camera Lens Glint */}
        <circle
          cx="17"
          cy="18"
          r="3.5"
          fill="#ffffff"
        />
        <circle
          cx="17"
          cy="18"
          r="1.8"
          fill="#1d4ed8"
        />
        <circle
          cx="16"
          cy="17"
          r="0.8"
          fill="#ffffff"
        />

        {/* Tactical Crosshair / Sensor Indicator */}
        <line x1="17" y1="9.5" x2="17" y2="11.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="17" y1="24.5" x2="17" y2="26.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="8.5" y1="18" x2="10.5" y2="18" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="23.5" y1="18" x2="25.5" y2="18" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
};

export default EagleEyeLogo;

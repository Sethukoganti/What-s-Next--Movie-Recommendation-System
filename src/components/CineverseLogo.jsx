import React from 'react';

const CineverseLogo = ({ size = 48, className = '' }) => (
  <svg
    className={`cineverse-logo ${className}`}
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="CineVerse logo"
    role="img"
  >
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ff164f" />
        <stop offset="55%" stopColor="#ff8fa3" />
        <stop offset="100%" stopColor="#00f0ff" />
      </linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <linearGradient id="frameGrad" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#a0a0ff" stopOpacity="0.6" />
      </linearGradient>
    </defs>

    {/* Outer neon ring */}
    <circle cx="32" cy="32" r="28" stroke="url(#logoGrad)" strokeWidth="1.2" fill="none" filter="url(#glow)" opacity="0.9" />
    <circle cx="32" cy="32" r="24" stroke="#ff164f" strokeWidth="0.5" fill="none" opacity="0.5" />

    {/* 3D film frame (tilted) */}
    <rect x="14" y="14" width="36" height="36" rx="4" ry="4" stroke="url(#frameGrad)" strokeWidth="2.5" fill="rgba(255,255,255,0.03)" />
    {/* Inner film strip lines */}
    <line x1="16" y1="22" x2="48" y2="22" stroke="#ff164f" strokeWidth="0.7" opacity="0.8" />
    <line x1="16" y1="42" x2="48" y2="42" stroke="#00f0ff" strokeWidth="0.7" opacity="0.8" />

    {/* Center play-triangle (3D bevel) */}
    <polygon points="28,24 28,40 40,32" fill="url(#logoGrad)" filter="url(#glow)" />
    <polygon points="29,26 29,38 38,32" fill="#fff" opacity="0.9" />

    {/* Spark dots */}
    <circle cx="46" cy="18" r="1.5" fill="#00f0ff" filter="url(#glow)" />
    <circle cx="18" cy="46" r="1.5" fill="#ff164f" filter="url(#glow)" />
  </svg>
);

export default CineverseLogo;

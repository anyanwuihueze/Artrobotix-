import React from 'react';

export type BrandEmblemSize = 'sm' | 'md' | 'lg' | 'card';
export type BrandEmblemTone = 'light' | 'dark';

interface BrandEmblemProps {
  size?: BrandEmblemSize;
  tone?: BrandEmblemTone;
  alt?: string;
}

const SIZE_CLASSES: Record<BrandEmblemSize, string> = {
  sm: 'w-[52px] h-[52px]',
  md: 'w-14 h-14',
  lg: 'w-14 h-14 sm:w-[60px] sm:h-[60px] lg:w-[68px] lg:h-[68px]',
  card: 'w-[68px] h-[68px]',
};

export default function BrandEmblem({
  size = 'lg',
  tone = 'light',
  alt = 'Artdrobotix Institute Seal',
}: BrandEmblemProps) {
  const isDark = tone === 'dark';

  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${SIZE_CLASSES[size]}`}
    >
      {/* Zone 1: Outer Calibration Reticle (r=33.5 on 72x72 coordinate grid) */}
      <svg
        viewBox="0 0 72 72"
        fill="none"
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 w-full h-full animate-orbit-cw transition-opacity duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
          isDark
            ? 'text-white/50 group-hover:text-white/90 group-focus-visible:text-white/90'
            : 'text-[#111111]/48 group-hover:text-[#111111]/85 group-focus-visible:text-[#111111]/85'
        }`}
      >
        <circle
          cx="36"
          cy="36"
          r="33.5"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeDasharray="34 10 8 10 38 10"
          strokeLinecap="round"
        />
        {/* Cardinal calibration ticks */}
        <line x1="36" y1="0.8" x2="36" y2="3.4" stroke="currentColor" strokeWidth="1.3" />
        <line x1="36" y1="68.6" x2="36" y2="71.2" stroke="currentColor" strokeWidth="1.3" />
        <line x1="0.8" y1="36" x2="3.4" y2="36" stroke="currentColor" strokeWidth="1.3" />
        <line x1="68.6" y1="36" x2="71.2" y2="36" stroke="currentColor" strokeWidth="1.3" />
        {/* Opposing micro index nodes */}
        <circle cx="36" cy="2.5" r="1.45" fill="currentColor" />
        <circle cx="36" cy="69.5" r="1.45" fill="currentColor" />
      </svg>

      {/* Zone 2: Active #F9501E Twin Sweep Arcs (r=29.0, crisp air gap outside seal) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-[36deg] group-focus-visible:rotate-[36deg] will-change-transform"
      >
        <svg
          viewBox="0 0 72 72"
          fill="none"
          className="w-full h-full animate-orbit-ccw opacity-90 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
        >
          <circle
            cx="36"
            cy="36"
            r="29"
            stroke="#F9501E"
            strokeWidth="1.9"
            strokeDasharray="34 57"
            strokeLinecap="round"
          />
        </svg>
      </span>

      {/* Zone 3: Circular Seal Core (72% diameter, clear of orbital rings) */}
      <img
        src="/assets/artdrobotix_seal.jpg"
        alt={alt}
        referrerPolicy="no-referrer"
        className={`relative z-10 w-[72%] h-[72%] rounded-full object-contain transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] group-focus-visible:scale-[1.04] will-change-transform ${
          isDark
            ? 'bg-white ring-1 ring-white/25'
            : 'bg-white ring-1 ring-neutral-200 group-hover:ring-[#F9501E]/40'
        }`}
      />
    </span>
  );
}

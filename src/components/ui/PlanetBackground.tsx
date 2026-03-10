import { useState } from 'react';

/**
 * Fixed planet background with dark overlay and grid pattern.
 * Mirrors the Sphere web app's DashboardLayout background.
 *
 * Requires `public/planet-bg.webp` — a single frame extracted from the Sphere
 * video. Falls back to a dark radial gradient if the image is missing.
 */
export function PlanetBackground() {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <>
      {/* Planet image with dark overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#060606]">
        {!imgFailed && (
          <img
            src="./planet-bg.webp"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            onError={() => setImgFailed(true)}
          />
        )}
        {/* CSS fallback gradient — only when image fails to load */}
        {imgFailed && (
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 60%, #1a0a00 0%, #060606 70%)',
            }}
          />
        )}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 z-[1] opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
    </>
  );
}

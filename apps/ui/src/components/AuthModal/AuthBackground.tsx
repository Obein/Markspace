import React from 'react';

/**
 * AuthBackground
 * Renders the pure dark #050507 canvas background and the ultra-dim
 * hardware-accelerated 120s rotating conic-gradient afterglow.
 */
export const AuthBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden -z-10">
      <div
        className="w-[140vw] h-[140vw] max-w-[2200px] max-h-[2200px] rounded-full blur-[140px] opacity-15 animate-[spin_120s_linear_infinite]"
        style={{
          background:
            'conic-gradient(from 0deg at 50% 50%, rgba(59,130,246,0.2) 0deg, rgba(0,0,0,0) 100deg, rgba(37,99,235,0.15) 180deg, rgba(0,0,0,0) 280deg, rgba(59,130,246,0.2) 360deg)',
        }}
      />
    </div>
  );
};

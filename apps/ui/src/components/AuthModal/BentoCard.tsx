import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

export interface BentoSpecItem {
  label: string;
  value: string;
}

export interface BentoCardProps {
  className?: string;
  heroTitle: React.ReactNode;
  heroSubtitle?: string;
  svgGraphic: React.ReactNode;
  detailTitle: string;
  detailSpecs?: BentoSpecItem[];
  detailText: string;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  className = '',
  heroTitle,
  heroSubtitle,
  svgGraphic,
  detailTitle,
  detailSpecs = [],
  detailText,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleCardClick = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    setTimeout(() => {
      setIsFlipped((prev) => !prev);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 160);
  };

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className={`cursor-pointer select-none rounded-3xl bg-[#101014]/90 border border-white/10 hover:border-blue-500/40 hover:bg-[#14141c] transition-all duration-300 shadow-xl backdrop-blur-xl relative overflow-hidden flex flex-col justify-center group p-4 sm:p-5 lg:p-6 min-h-[90px] ${
        isTransitioning
          ? 'scale-95 blur-md opacity-60'
          : 'scale-100 blur-0 opacity-100'
      } ${className}`}
    >
      {/* Subtle top-edge light reflection for Apple glass look */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      {!isFlipped ? (
        /* FRONT OVERVIEW VIEW: Minimalist SVG Background + Giant Foreground Typography */
        <div className="relative w-full h-full flex flex-col justify-center items-start z-10">
          {/* Minimalist Background SVG Pattern */}
          <div className="absolute inset-0 flex items-center justify-end pointer-events-none opacity-20 group-hover:opacity-35 group-hover:scale-105 transition-all duration-500 overflow-hidden -z-10">
            {svgGraphic}
          </div>

          {/* Foreground Bold Keynote Typography */}
          <div className="space-y-1.5 z-10 pr-4">
            <div className="text-white font-black tracking-tight leading-tight">
              {heroTitle}
            </div>
            {heroSubtitle && (
              <div className="text-xs sm:text-sm font-bold font-mono tracking-wider text-zinc-400 group-hover:text-blue-300 transition-colors uppercase">
                {heroSubtitle}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* BACK DETAIL DEEP-DIVE VIEW */
        <div className="flex flex-col justify-between h-full w-full animate-in fade-in duration-200 z-10">
          <div>
            {/* Top Bar with Return indicator */}
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-blue-400 font-mono">
                {detailTitle}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1 hover:text-white transition">
                <RotateCcw className="w-3 h-3" />
                <span>Back</span>
              </span>
            </div>

            {/* Detailed Body Text */}
            <p className="text-xs text-zinc-300 leading-relaxed mt-2 mb-3 font-sans">
              {detailText}
            </p>
          </div>

          {/* Technical Specs Key-Value Matrix */}
          {detailSpecs.length > 0 && (
            <div className="mt-auto pt-2 border-t border-white/5 space-y-1 font-mono text-[10px]">
              {detailSpecs.map((spec, i) => (
                <div key={i} className="flex items-center justify-between text-zinc-400">
                  <span>{spec.label}:</span>
                  <span className="text-zinc-200 font-medium">{spec.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

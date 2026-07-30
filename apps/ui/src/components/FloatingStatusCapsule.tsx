import React from 'react';
import { ShieldCheck, UserCheck, Eye, Edit3, Sun, Moon } from 'lucide-react';

interface FloatingStatusCapsuleProps {
  wordCount: number;
  charCount: number;
  isPreview: boolean;
  onTogglePreview: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isSaving: boolean;
}

export const FloatingStatusCapsule: React.FC<FloatingStatusCapsuleProps> = ({
  wordCount,
  charCount,
  isPreview,
  onTogglePreview,
  isDark,
  onToggleTheme,
  isSaving,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 glass-capsule rounded-capsule flex items-center gap-5 text-xs text-zinc-300 border border-white/10 shadow-2xl transition-all hover:scale-[1.02]">
      {/* Account Online Status */}
      <div className="flex items-center gap-1.5 text-blue-400 font-medium" title="Account Session Active">
        <UserCheck className="w-4 h-4" />
        <span>Account Online</span>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* E2EE Vault Status */}
      <div className="flex items-center gap-1.5 text-emerald-400 font-medium" title="Data Encryption Key Unlocked in Memory">
        <ShieldCheck className="w-4 h-4" />
        <span>Vault Unlocked</span>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Word & Character Count */}
      <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
        <span>{wordCount} words</span>
        <span>{charCount} chars</span>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Save Indicator */}
      <div className="flex items-center gap-2">
        {isSaving ? (
          <span className="text-amber-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Saving...
          </span>
        ) : (
          <span className="text-zinc-500">Synced</span>
        )}
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Preview / Edit Toggle */}
      <button
        onClick={onTogglePreview}
        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 transition flex items-center gap-1"
        title={isPreview ? 'Switch to Edit' : 'Switch to Preview'}
      >
        {isPreview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        <span className="text-[11px]">{isPreview ? 'Edit' : 'Preview'}</span>
      </button>

      {/* Theme Switcher */}
      <button
        onClick={onToggleTheme}
        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 transition"
        title="Toggle Dark/Light Mode"
      >
        {isDark ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-blue-300" />}
      </button>
    </div>
  );
};

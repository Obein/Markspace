import React from 'react';
import { Eye, Edit3, Sun, Moon, Crown, Lock, User, Download, Trash2 } from 'lucide-react';
import { UserRole } from '../interfaces/IApiClient';

interface FloatingStatusCapsuleProps {
  username: string | null;
  role: UserRole | null;
  isVaultUnlocked: boolean;
  onOpenProfile: () => void;
  onOpenUnlockModal: () => void;
  wordCount: number;
  charCount: number;
  isPreview: boolean;
  onTogglePreview: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isSaving: boolean;
  onDownloadCurrentFile?: () => void;
  onDeleteCurrentFile?: () => void;
}

export const FloatingStatusCapsule: React.FC<FloatingStatusCapsuleProps> = ({
  username,
  role,
  isVaultUnlocked,
  onOpenProfile,
  onOpenUnlockModal,
  wordCount,
  charCount,
  isPreview,
  onTogglePreview,
  isDark,
  onToggleTheme,
  isSaving,
  onDownloadCurrentFile,
  onDeleteCurrentFile,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 glass-capsule rounded-capsule flex items-center gap-4 text-xs text-zinc-300 border border-white/10 shadow-2xl transition-all hover:scale-[1.02]">
      {/* User Profile & Role Link */}
      <button
        onClick={onOpenProfile}
        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition group focus:outline-none"
        title="Click to open User Profile & Vault Settings"
      >
        <div className="p-1 rounded-md bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 transition">
          <User className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <span className="font-mono text-xs font-semibold text-zinc-200 group-hover:underline">
          {username || 'Anonymous'}
        </span>
        {role === 'admin' ? (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
            <Crown className="w-2.5 h-2.5 text-blue-400" />
            <span>ADMIN</span>
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/5 text-zinc-400 border border-white/10">
            USER
          </span>
        )}
      </button>

      {/* Only show Lock warning if Vault is Locked */}
      {!isVaultUnlocked && (
        <>
          <div className="w-px h-4 bg-white/10" />
          <button
            onClick={onOpenUnlockModal}
            className="flex items-center gap-1.5 text-blue-300 hover:text-blue-200 font-medium transition"
            title="Click to enter Data Password and Unlock Vault"
          >
            <Lock className="w-4 h-4 animate-pulse text-blue-400" />
            <span className="underline">Vault Locked (Click to Unlock)</span>
          </button>
        </>
      )}

      {isVaultUnlocked && (
        <>
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
              <span className="text-blue-400 flex items-center gap-1 font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                Saving...
              </span>
            ) : (
              <span className="text-zinc-500 font-mono text-[11px]">Synced</span>
            )}
          </div>

          {/* File Download Button */}
          {onDownloadCurrentFile && (
            <>
              <div className="w-px h-4 bg-white/10" />
              <button
                onClick={onDownloadCurrentFile}
                className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 transition flex items-center gap-1.5"
                title="Download Current File to Local Disk"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-medium">Download</span>
              </button>
            </>
          )}

          {/* File Delete Button */}
          {onDeleteCurrentFile && (
            <>
              <div className="w-px h-4 bg-white/10" />
              <button
                onClick={onDeleteCurrentFile}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-blue-300 border border-white/10 transition flex items-center gap-1.5"
                title="Delete Current File"
              >
                <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-blue-400" />
                <span className="text-[11px] font-medium">Delete</span>
              </button>
            </>
          )}

          <div className="w-px h-4 bg-white/10" />

          {/* Preview / Edit Toggle */}
          <button
            onClick={onTogglePreview}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 transition flex items-center gap-1"
            title={isPreview ? 'Switch to Edit' : 'Switch to Preview'}
          >
            {isPreview ? <Edit3 className="w-3.5 h-3.5 text-blue-400" /> : <Eye className="w-3.5 h-3.5 text-blue-400" />}
            <span className="text-[11px]">{isPreview ? 'Edit' : 'Preview'}</span>
          </button>
        </>
      )}

      <div className="w-px h-4 bg-white/10" />

      {/* Theme Switcher */}
      <button
        onClick={onToggleTheme}
        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 transition"
        title="Toggle Dark/Light Mode"
      >
        {isDark ? <Sun className="w-3.5 h-3.5 text-blue-300" /> : <Moon className="w-3.5 h-3.5 text-blue-400" />}
      </button>
    </div>
  );
};

import React, { useState } from 'react';
import { Eye, Edit3, Sun, Moon, Lock, User, Download, Trash2, History } from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';
import { UserRole } from '../interfaces/IApiClient';

interface FloatingStatusCapsuleProps {
  username: string | null;
  role: UserRole | null;
  isVaultUnlocked: boolean;
  onOpenProfile: () => void;
  onOpenUnlockModal: () => void;
  wordCount: number;
  charCount: number;
  selectedWordCount?: number;
  selectedCharCount?: number;
  isPreview: boolean;
  onTogglePreview: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isSaving: boolean;
  onDownloadCurrentFile?: () => void;
  onDeleteCurrentFile?: () => void;
  onOpenHistory?: () => void;
}

export const FloatingStatusCapsule: React.FC<FloatingStatusCapsuleProps> = ({
  username,
  role,
  isVaultUnlocked,
  onOpenProfile,
  onOpenUnlockModal,
  wordCount,
  charCount,
  selectedWordCount = 0,
  selectedCharCount = 0,
  isPreview,
  onTogglePreview,
  isDark,
  onToggleTheme,
  isSaving,
  onDownloadCurrentFile,
  onDeleteCurrentFile,
  onOpenHistory,
}) => {
  const { t } = useI18n();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hasSelection = selectedCharCount > 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)] overflow-x-auto scrollbar-none px-5 py-2.5 glass-capsule rounded-capsule flex items-center gap-3 sm:gap-4 text-xs text-zinc-300 border border-white/15 shadow-2xl transition-all hover:scale-[1.01] select-none pointer-events-auto whitespace-nowrap">
      {/* User Profile & Role Link */}
      <button
        onClick={onOpenProfile}
        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition group focus:outline-none shrink-0"
        title="Click to open User Profile & Vault Settings"
      >
        <div className="p-1 rounded-md bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 transition">
          <User className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <span className="font-mono text-xs font-semibold text-zinc-200 group-hover:underline">
          {username || 'Anonymous'}
        </span>
        {role === 'admin' ? (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1 shrink-0">
            <span>ADMIN</span>
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/5 text-zinc-400 border border-white/10 shrink-0">
            USER
          </span>
        )}
      </button>

      {/* Only show Lock warning if Vault is Locked */}
      {!isVaultUnlocked && (
        <>
          <div className="w-px h-4 bg-white/10 shrink-0" />
          <button
            onClick={onOpenUnlockModal}
            className="flex items-center gap-1.5 text-blue-300 hover:text-blue-200 font-medium transition shrink-0"
            title="Click to enter Data Password and Unlock Vault"
          >
            <Lock className="w-4 h-4 animate-pulse text-blue-400 shrink-0" />
            <span className="underline whitespace-nowrap">{t('unlockVault')}</span>
          </button>
        </>
      )}

      {isVaultUnlocked && (
        <>
          <div className="w-px h-4 bg-white/10 shrink-0" />

          {/* Word & Character Count (With Selection Stats) */}
          <div className="flex items-center gap-3 font-mono text-[11px] shrink-0 whitespace-nowrap">
            {hasSelection ? (
              <>
                <span className="text-blue-400 font-medium">
                  {selectedWordCount}/{wordCount} {t('selWords')}
                </span>
                <span className="text-blue-400 font-medium">
                  {selectedCharCount}/{charCount} {t('selChars')}
                </span>
              </>
            ) : (
              <>
                <span className="text-zinc-400">{wordCount} {t('words')}</span>
                <span className="text-zinc-400">{charCount} {t('chars')}</span>
              </>
            )}
          </div>

          <div className="w-px h-4 bg-white/10 shrink-0" />

          {/* Save Indicator */}
          <div className="flex items-center gap-2 shrink-0">
            {isSaving ? (
              <span className="text-blue-400 flex items-center gap-1 font-mono text-[11px] whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                {t('saving')}
              </span>
            ) : (
              <span className="text-zinc-500 font-mono text-[11px] whitespace-nowrap">{t('saved')}</span>
            )}
          </div>

          {/* Version History Button */}
          {onOpenHistory && (
            <>
              <div className="w-px h-4 bg-white/10 shrink-0" />
              <button
                onClick={onOpenHistory}
                className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 transition flex items-center gap-1.5 shrink-0"
                title={t('versionHistory')}
              >
                <History className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-[11px] font-medium whitespace-nowrap">{t('history')}</span>
              </button>
            </>
          )}

          {/* File Download Button */}
          {onDownloadCurrentFile && (
            <>
              <div className="w-px h-4 bg-white/10 shrink-0" />
              <button
                onClick={onDownloadCurrentFile}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition flex items-center gap-1.5 shrink-0"
                title="Download Current File"
              >
                <Download className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-[11px] font-medium whitespace-nowrap">{t('download')}</span>
              </button>
            </>
          )}

          {/* File Delete Button with Confirmation Tooltip */}
          {onDeleteCurrentFile && (
            <>
              <div className="w-px h-4 bg-white/10 shrink-0" />
              <div className="relative inline-flex items-center shrink-0">
                <button
                  onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                  className={`p-1.5 rounded-lg border transition flex items-center gap-1.5 shrink-0 ${
                    showDeleteConfirm
                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                      : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-red-400 border-white/10'
                  }`}
                  title={t('delete')}
                >
                  <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400 shrink-0" />
                  <span className="text-[11px] font-medium whitespace-nowrap">{t('delete')}</span>
                </button>

                {/* Inline Confirmation Tooltip Popover */}
                {showDeleteConfirm && (
                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 p-2.5 rounded-xl bg-[#09090B]/95 border border-red-500/30 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-2 text-xs font-mono animate-in fade-in zoom-in-95 duration-100 min-w-[190px]">
                    <p className="text-zinc-200 text-[11px] font-medium whitespace-nowrap text-center">
                      {t('confirmDelete')}
                    </p>
                    <div className="flex items-center gap-2 w-full justify-center">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          onDeleteCurrentFile();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-[11px] transition shadow-lg shadow-red-500/20"
                      >
                        {t('confirm')}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-300 text-[11px] transition"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                    {/* Tooltip Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-[#09090B]/95" />
                  </div>
                )}
              </div>
            </>
          )}

          <div className="w-px h-4 bg-white/10 shrink-0" />

          {/* Preview / Edit Toggle */}
          <button
            onClick={onTogglePreview}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 transition flex items-center gap-1 shrink-0"
            title={isPreview ? 'Switch to Edit' : 'Switch to Preview'}
          >
            {isPreview ? <Edit3 className="w-3.5 h-3.5 text-blue-400 shrink-0" /> : <Eye className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
            <span className="text-[11px] whitespace-nowrap">{isPreview ? t('edit') : t('preview')}</span>
          </button>
        </>
      )}

      <div className="w-px h-4 bg-white/10 shrink-0" />

      {/* Theme Switcher */}
      <button
        onClick={onToggleTheme}
        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 transition shrink-0"
        title="Toggle Dark/Light Mode"
      >
        {isDark ? <Sun className="w-3.5 h-3.5 text-blue-300 shrink-0" /> : <Moon className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
      </button>
    </div>
  );
};

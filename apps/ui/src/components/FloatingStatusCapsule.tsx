import React, { useState } from 'react';
import { Eye, Edit3, Sun, Moon, Lock, User, Download, Trash2, History, Columns2, Undo2, Redo2 } from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';
import { UserRole } from '../interfaces/IApiClient';

interface FloatingStatusCapsuleProps {
  username: string | null;
  role: UserRole | null;
  isVaultUnlocked: boolean;
  hasActiveFile?: boolean;
  onOpenProfile: () => void;
  onOpenUnlockModal: () => void;
  wordCount: number;
  charCount: number;
  selectedWordCount?: number;
  selectedCharCount?: number;
  isPreview: boolean;
  onTogglePreview: () => void;
  isSplitView?: boolean;
  onToggleSplitView?: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isSaving: boolean;
  onDownloadCurrentFile?: () => void;
  onDeleteCurrentFile?: () => void;
  onOpenHistory?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const FloatingStatusCapsule: React.FC<FloatingStatusCapsuleProps> = ({
  username,
  role,
  isVaultUnlocked,
  hasActiveFile = false,
  onOpenProfile,
  onOpenUnlockModal,
  wordCount,
  charCount,
  selectedWordCount = 0,
  selectedCharCount = 0,
  isPreview,
  onTogglePreview,
  isSplitView = false,
  onToggleSplitView,
  isDark,
  onToggleTheme,
  isSaving,
  onDownloadCurrentFile,
  onDeleteCurrentFile,
  onOpenHistory,
  onUndo,
  onRedo,
}) => {
  const { t } = useI18n();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hasSelection = selectedCharCount > 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)] overflow-x-auto scrollbar-none px-5 py-2.5 glass-capsule rounded-capsule flex items-center gap-3 sm:gap-4 text-xs text-zinc-200 transition-all hover:scale-[1.01] select-none pointer-events-auto whitespace-nowrap">
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

      {/* File Operation Tools: Only visible when Vault is Unlocked AND a File is Focused */}
      {isVaultUnlocked && hasActiveFile && (
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

          {/* Undo / Redo Actions */}
          {(onUndo || onRedo) && (
            <>
              <div className="w-px h-4 bg-white/10 shrink-0" />
              <div className="flex items-center gap-1 shrink-0">
                {onUndo && (
                  <button
                    onClick={onUndo}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition flex items-center justify-center shrink-0 cursor-pointer"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 className="w-3.5 h-3.5 text-zinc-300" />
                  </button>
                )}
                {onRedo && (
                  <button
                    onClick={onRedo}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition flex items-center justify-center shrink-0 cursor-pointer"
                    title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
                  >
                    <Redo2 className="w-3.5 h-3.5 text-zinc-300" />
                  </button>
                )}
              </div>
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

          {/* File Delete Button with Confirmation */}
          {onDeleteCurrentFile && (
            <>
              <div className="w-px h-4 bg-white/10 shrink-0" />
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-xl px-2.5 py-1 animate-in fade-in duration-100 shrink-0">
                  <span className="text-[11px] text-red-300 font-medium whitespace-nowrap">
                    {t('confirmDelete')}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        onDeleteCurrentFile();
                      }}
                      className="px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-[10px] transition shadow-md shadow-red-500/20"
                    >
                      {t('confirm')}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-1.5 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 text-[10px] transition"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-red-400 border border-white/10 transition flex items-center gap-1.5 shrink-0"
                  title={t('delete')}
                >
                  <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400 shrink-0" />
                  <span className="text-[11px] font-medium whitespace-nowrap">{t('delete')}</span>
                </button>
              )}
            </>
          )}

          {/* Preview / Edit Toggle (Hidden when Split View is enabled) */}
          {!isSplitView && (
            <>
              <div className="w-px h-4 bg-white/10 shrink-0" />
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

          {/* Split View Switch Toggle (To the right of Edit / Preview) */}
          {onToggleSplitView && (
            <>
              <div className="w-px h-4 bg-white/10 shrink-0" />
              <button
                onClick={onToggleSplitView}
                className={`p-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 border cursor-pointer ${
                  isSplitView
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 shadow-sm shadow-blue-500/20'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300'
                }`}
                title={t('splitView')}
              >
                <Columns2 className={`w-3.5 h-3.5 ${isSplitView ? 'text-blue-400' : 'text-zinc-400'} shrink-0`} />
                {/* Visual Switch Pill */}
                <div
                  className={`w-7 h-3.5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    isSplitView ? 'bg-blue-600 justify-end' : 'bg-zinc-700 justify-start'
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-white shadow-md transition-all" />
                </div>
              </button>
            </>
          )}
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

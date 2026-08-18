import React from 'react';
import { Lock, Sun, Moon } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { FloatingStatusCapsuleProps } from './FloatingStatusCapsule.types';
import { UserBadge } from './UserBadge';
import { EditorActionControls } from './EditorActionControls';
import { ViewModeControls } from './ViewModeControls';

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
  isSaveFailed = false,
  onRetrySave,
  onDownloadCurrentFile,
  onDeleteCurrentFile,
  onOpenHistory,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  const { t } = useI18n();
  const hasSelection = selectedCharCount > 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)] overflow-x-auto scrollbar-none px-5 py-2.5 glass-capsule backdrop-blur-[10px] rounded-capsule flex items-center gap-3 sm:gap-4 text-xs text-zinc-800 dark:text-zinc-200 transition-all hover:scale-[1.01] select-none pointer-events-auto whitespace-nowrap shadow-xl">
      {/* User Profile & Role Link */}
      <UserBadge username={username} role={role} onOpenProfile={onOpenProfile} />

      {/* Only show Lock warning if Vault is Locked */}
      {!isVaultUnlocked && (
        <>
          <div className="w-px h-4 bg-black/10 dark:bg-white/10 shrink-0" />
          <button
            onClick={onOpenUnlockModal}
            className="flex items-center gap-1.5 text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 font-medium transition shrink-0 cursor-pointer"
            title="Click to enter Data Password and Unlock Vault"
          >
            <Lock className="w-4 h-4 animate-pulse text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="underline whitespace-nowrap">{t('unlockVault')}</span>
          </button>
        </>
      )}

      {/* File Operation Tools: Only visible when Vault is Unlocked AND a File is Focused */}
      {isVaultUnlocked && hasActiveFile && (
        <>
          <div className="w-px h-4 bg-black/10 dark:bg-white/10 shrink-0" />

          {/* Word & Character Count (With Selection Stats) */}
          <div className="flex items-center gap-3 font-mono text-[11px] shrink-0 whitespace-nowrap">
            {hasSelection ? (
              <>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {selectedWordCount}/{wordCount} {t('selWords')}
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {selectedCharCount}/{charCount} {t('selChars')}
                </span>
              </>
            ) : (
              <>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {wordCount} {t('words')}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {charCount} {t('chars')}
                </span>
              </>
            )}
          </div>

          <div className="w-px h-4 bg-black/10 dark:bg-white/10 shrink-0" />

          {/* Save Indicator */}
          <div className="flex items-center gap-2 shrink-0">
            {isSaving ? (
              <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-mono text-[11px] whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping" />
                {t('saving')}
              </span>
            ) : isSaveFailed ? (
              <button
                type="button"
                onClick={onRetrySave}
                className="flex items-center gap-1.5 font-mono text-[11px] whitespace-nowrap font-medium text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition cursor-pointer hover:underline focus:outline-none"
                title="Unsaved changes. Click to retry saving / 未保存，点击重试保存"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                <span>{t('unsaved')}</span>
              </button>
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[11px] whitespace-nowrap">
                {t('saved')}
              </span>
            )}
          </div>

          {/* Actions: History, Undo/Redo, Download, Delete */}
          <EditorActionControls
            onOpenHistory={onOpenHistory}
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onDownloadCurrentFile={onDownloadCurrentFile}
            onDeleteCurrentFile={onDeleteCurrentFile}
          />

          {/* View Modes: Edit/Preview toggle & Split View */}
          <ViewModeControls
            isPreview={isPreview}
            onTogglePreview={onTogglePreview}
            isSplitView={isSplitView}
            onToggleSplitView={onToggleSplitView}
          />
        </>
      )}

      <div className="w-px h-4 bg-black/10 dark:bg-white/10 shrink-0" />

      {/* Theme Switcher */}
      <button
        onClick={onToggleTheme}
        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition shrink-0 cursor-pointer"
        title="Toggle Dark/Light Mode"
      >
        {isDark ? (
          <Sun className="w-3.5 h-3.5 text-amber-400 dark:text-blue-300 shrink-0" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        )}
      </button>
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, Sun, Moon, ChevronUp } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { FloatingStatusCapsuleProps } from './FloatingStatusCapsule.types';
import { UserBadge } from './UserBadge';
import { EditorActionControls } from './EditorActionControls';
import { ViewModeControls } from './ViewModeControls';

/**
 * FloatingStatusCapsule
 *
 * Responsive behaviour:
 * - sm+ (≥640 px): centred pill capsule, max-w calc(100vw-2rem), horizontal scroll.
 * - <sm (mobile):
 *   • Collapsed: a compact rounded square (40x40) at bottom-4 left-4.
 *   • Expanded: seamlessly translates and blooms into the viewport center
 *     (bottom-6 left-1/2 -translate-x-1/2) with multi-row layout.
 *   • Backdrop only mounts when expanded to ensure zero touch interference when collapsed.
 */
export const FloatingStatusCapsule: React.FC<FloatingStatusCapsuleProps> = ({
  username,
  role,
  isVaultUnlocked,
  hasActiveFile = false,
  onOpenProfile,
  onOpenAdmin,
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

  // ── Mobile detection ────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Collapse when clicking outside the expanded mobile panel
  const handleOutsideClick = useCallback((e: MouseEvent | TouchEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      setIsMobileExpanded(false);
    }
  }, []);

  useEffect(() => {
    if (isMobile && isMobileExpanded) {
      const timer = setTimeout(() => {
        document.addEventListener('pointerdown', handleOutsideClick);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('pointerdown', handleOutsideClick);
      };
    }
    document.removeEventListener('pointerdown', handleOutsideClick);
  }, [isMobile, isMobileExpanded, handleOutsideClick]);

  // ── Shared inner content ─────────────────────────────────────────────────────
  const innerContent = (
    <>
      {/* User Profile & Role Link */}
      <UserBadge
        username={username}
        role={role}
        onOpenProfile={() => {
          if (isMobile) setIsMobileExpanded(false);
          onOpenProfile?.();
        }}
        onOpenAdmin={
          onOpenAdmin
            ? () => {
                if (isMobile) setIsMobileExpanded(false);
                onOpenAdmin();
              }
            : undefined
        }
      />

      {/* Only show Lock warning if Vault is Locked */}
      {!isVaultUnlocked && (
        <>
          <div className="w-px h-4 bg-black/10 dark:bg-white/10 shrink-0" />
          <button
            onClick={() => {
              if (isMobile) setIsMobileExpanded(false);
              onOpenUnlockModal();
            }}
            className="flex items-center gap-1.5 text-primaryColor-600 dark:text-primaryColor-300 hover:text-primaryColor-700 dark:hover:text-primaryColor-200 font-medium transition shrink-0 cursor-pointer"
            title="Click to enter Data Password and Unlock Vault"
          >
            <Lock className="w-4 h-4 animate-pulse text-primaryColor-600 dark:text-primaryColor-400 shrink-0" />
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
                <span className="text-primaryColor-600 dark:text-primaryColor-400 font-medium">
                  {selectedWordCount}/{wordCount} {t('selWords')}
                </span>
                <span className="text-primaryColor-600 dark:text-primaryColor-400 font-medium">
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
              <span className="text-primaryColor-600 dark:text-primaryColor-400 flex items-center gap-1 font-mono text-[11px] whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-primaryColor-600 dark:bg-primaryColor-400 animate-ping" />
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
            onOpenHistory={
              onOpenHistory
                ? () => {
                    if (isMobile) setIsMobileExpanded(false);
                    onOpenHistory();
                  }
                : undefined
            }
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
          <Sun className="w-3.5 h-3.5 text-amber-400 dark:text-primaryColor-300 shrink-0" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-primaryColor-600 dark:text-primaryColor-400 shrink-0" />
        )}
      </button>
    </>
  );

  // ── Desktop: original centred pill capsule ───────────────────────────────────
  if (!isMobile) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)] overflow-x-auto scrollbar-none px-5 py-2.5 glass-capsule backdrop-blur-[10px] rounded-capsule flex items-center gap-3 sm:gap-4 text-xs text-zinc-800 dark:text-zinc-200 transition-all hover:scale-[1.01] select-none pointer-events-auto whitespace-nowrap shadow-xl">
        {innerContent}
      </div>
    );
  }

  // ── Mobile: animated floating capsule with constant-size corner-to-center translation ─────
  return (
    <>
      {/* Backdrop overlay — only mounted when expanded to completely avoid touch blocking */}
      {isMobileExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setIsMobileExpanded(false)}
          aria-hidden="true"
        />
      )}

      {/* Animated container — maintains constant size, smoothly translates from bottom-left corner to bottom-center */}
      <div
        ref={panelRef}
        onClick={!isMobileExpanded ? () => setIsMobileExpanded(true) : undefined}
        style={{
          transform: isMobileExpanded
            ? 'translate(calc(50vw - 50%), -1.5rem)'
            : 'translate(calc(-100% + 44px), calc(100% - 44px))',
        }}
        className={`fixed bottom-0 left-0 z-50 w-[min(calc(100vw-2rem),360px)] p-3.5 rounded-2xl glass-capsule backdrop-blur-xl bg-white/95 dark:bg-[#18181e]/95 select-none shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border border-black/10 dark:border-white/15 ${
          !isMobileExpanded ? 'cursor-pointer hover:shadow-primaryColor-500/20 active:scale-95' : ''
        }`}
      >
        {/* Top-right corner peek indicator / close toggle */}
        <div
          className={`absolute top-1 right-1 w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 dark:text-zinc-400 ${
            !isMobileExpanded ? 'pointer-events-none' : 'hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer'
          }`}
          onClick={
            isMobileExpanded
              ? (e) => {
                  e.stopPropagation();
                  setIsMobileExpanded(false);
                }
              : undefined
          }
          title={isMobileExpanded ? 'Close Menu' : 'Open Menu'}
        >
          <ChevronUp
            className={`w-4 h-4 transition-transform duration-300 ${
              isMobileExpanded ? 'rotate-180 text-zinc-400' : ''
            }`}
          />
          {isSaving && (
            <span className="w-1.5 h-1.5 rounded-full bg-primaryColor-500 animate-ping absolute top-2 right-2" />
          )}
          {isSaveFailed && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse absolute top-2 right-2" />
          )}
        </div>

        {/* Menu Items Layout */}
        <div
          className={`flex flex-wrap gap-x-3 gap-y-2 items-center text-xs text-zinc-800 dark:text-zinc-200 pr-7 transition-opacity duration-200 ${
            isMobileExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {innerContent}
        </div>
      </div>
    </>
  );
};

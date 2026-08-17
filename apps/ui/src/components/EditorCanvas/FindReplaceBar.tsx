import React, { useRef, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Replace,
  ReplaceAll,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';

interface FindReplaceBarProps {
  isOpen: boolean;
  isReplaceMode: boolean;
  setIsReplaceMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  replaceQuery: string;
  setReplaceQuery: (val: string) => void;
  isRegex: boolean;
  setIsRegex: (val: boolean | ((prev: boolean) => boolean)) => void;
  isCaseSensitive: boolean;
  setIsCaseSensitive: (val: boolean | ((prev: boolean) => boolean)) => void;
  isWholeWord: boolean;
  setIsWholeWord: (val: boolean | ((prev: boolean) => boolean)) => void;
  matchesCount: number;
  currentMatchIndex: number;
  regexError: string | null;
  onFindNext: () => void;
  onFindPrev: () => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

export const FindReplaceBar: React.FC<FindReplaceBarProps> = ({
  isOpen,
  isReplaceMode,
  setIsReplaceMode,
  searchQuery,
  setSearchQuery,
  replaceQuery,
  setReplaceQuery,
  isRegex,
  setIsRegex,
  isCaseSensitive,
  setIsCaseSensitive,
  isWholeWord,
  setIsWholeWord,
  matchesCount,
  currentMatchIndex,
  regexError,
  onFindNext,
  onFindPrev,
  onReplaceCurrent,
  onReplaceAll,
  onClose,
}) => {
  const { t } = useI18n();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onFindPrev();
      } else {
        onFindNext();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleReplaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onReplaceCurrent();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="absolute top-14 right-4 sm:right-6 z-40 w-[calc(100vw-2rem)] sm:w-[420px] max-w-[460px] backdrop-blur-xl bg-white/95 dark:bg-[#121216]/95 border border-black/10 dark:border-white/15 rounded-2xl shadow-2xl p-2.5 space-y-2 text-xs font-mono select-none animate-in fade-in slide-in-from-top-2 duration-150 box-border">
      {/* Search Bar Row */}
      <div className="flex items-center gap-1.5 w-full min-w-0">
        <button
          onClick={() => setIsReplaceMode((prev) => !prev)}
          className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
          title={isReplaceMode ? 'Collapse Replace' : 'Expand Replace'}
        >
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isReplaceMode ? 'rotate-90 text-blue-600 dark:text-blue-400' : ''
            }`}
          />
        </button>

        <div className="relative flex-1 min-w-0 flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2 text-zinc-400 dark:text-zinc-500 pointer-events-none shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t('findPlaceholder') || 'Find...'}
            className={`w-full min-w-0 pl-7 pr-14 py-1 bg-black/5 dark:bg-black/30 border rounded-lg text-xs font-mono text-zinc-900 dark:text-white focus:outline-none transition ${
              regexError
                ? 'border-red-500 focus:border-red-500'
                : 'border-black/10 dark:border-white/10 focus:border-blue-500'
            }`}
          />

          {/* Match Counter Badge */}
          <span className="absolute right-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono pointer-events-none whitespace-nowrap">
            {regexError ? (
              <span className="text-red-500 font-bold" title={regexError}>
                Error
              </span>
            ) : searchQuery ? (
              matchesCount > 0 ? (
                `${currentMatchIndex + 1}/${matchesCount}`
              ) : (
                '0/0'
              )
            ) : null}
          </span>
        </div>

        {/* Search Options: Case Sensitivity, Whole Word, Regex */}
        <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 p-0.5 rounded-lg border border-black/5 dark:border-white/10 shrink-0">
          <button
            onClick={() => setIsCaseSensitive((prev) => !prev)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              isCaseSensitive
                ? 'bg-blue-600 text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
            title="Match Case (Aa)"
          >
            Aa
          </button>
          <button
            onClick={() => setIsWholeWord((prev) => !prev)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              isWholeWord
                ? 'bg-blue-600 text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
            title="Match Whole Word (\b)"
          >
            \b
          </button>
          <button
            onClick={() => setIsRegex((prev) => !prev)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              isRegex
                ? 'bg-blue-600 text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
            title="Use Regular Expression (.*)"
          >
            .*
          </button>
        </div>

        {/* Prev / Next Match Navigation */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onFindPrev}
            disabled={matchesCount === 0}
            className="p-1 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Previous Match (Shift+Enter)"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onFindNext}
            disabled={matchesCount === 0}
            className="p-1 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Next Match (Enter)"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
          title="Close (Escape)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Replace Row */}
      {isReplaceMode && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-black/5 dark:border-white/10 animate-in fade-in duration-100 w-full min-w-0">
          <div className="w-5 shrink-0 flex items-center justify-center text-zinc-400">
            <Sparkles className="w-3 h-3 text-blue-500/70" />
          </div>

          <input
            ref={replaceInputRef}
            type="text"
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            onKeyDown={handleReplaceKeyDown}
            placeholder={
              isRegex
                ? 'Replace... ($1, $2)'
                : (t('replacePlaceholder') || 'Replace with...')
            }
            className="flex-1 min-w-0 px-2.5 py-1 bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-lg text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
          />

          <button
            onClick={onReplaceCurrent}
            disabled={matchesCount === 0}
            className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-black/10 dark:border-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
            title="Replace Current (Enter in replace input)"
          >
            <Replace className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-[10px] font-medium whitespace-nowrap">{t('replace') || 'Replace'}</span>
          </button>

          <button
            onClick={onReplaceAll}
            disabled={matchesCount === 0}
            className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap shadow-sm"
            title="Replace All Matches"
          >
            <ReplaceAll className="w-3 h-3 shrink-0" />
            <span className="text-[10px] font-medium whitespace-nowrap">{t('replaceAll') || 'All'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

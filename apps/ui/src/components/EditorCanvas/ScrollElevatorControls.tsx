import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';

export interface ScrollElevatorControlsProps {
  onScrollToTop: () => void;
  onScrollToBottom: () => void;
}

export const ScrollElevatorControls: React.FC<ScrollElevatorControlsProps> = ({
  onScrollToTop,
  onScrollToBottom,
}) => {
  const { t } = useI18n();

  return (
    <div className="fixed right-3 sm:right-6 bottom-24 sm:bottom-20 z-30 flex flex-col gap-1.5 opacity-40 hover:opacity-100 transition-opacity duration-300">
      <button
        type="button"
        onClick={onScrollToTop}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/70 dark:bg-zinc-800/70 border border-black/10 dark:border-white/10 shadow-lg backdrop-blur-md text-zinc-600 dark:text-zinc-300 hover:text-primaryColor-600 dark:hover:text-primaryColor-400 hover:scale-110 active:scale-95 transition flex items-center justify-center cursor-pointer"
        title={t('scrollToTop') || 'Scroll to top'}
      >
        <ChevronUp className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onScrollToBottom}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/70 dark:bg-zinc-800/70 border border-black/10 dark:border-white/10 shadow-lg backdrop-blur-md text-zinc-600 dark:text-zinc-300 hover:text-primaryColor-600 dark:hover:text-primaryColor-400 hover:scale-110 active:scale-95 transition flex items-center justify-center cursor-pointer"
        title={t('scrollToBottom') || 'Scroll to bottom'}
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
};

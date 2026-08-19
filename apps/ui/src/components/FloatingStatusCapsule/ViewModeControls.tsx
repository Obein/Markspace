import React from 'react';
import { Eye, Edit3, Columns2 } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';

interface ViewModeControlsProps {
  isPreview: boolean;
  onTogglePreview: () => void;
  isSplitView?: boolean;
  onToggleSplitView?: () => void;
}

export const ViewModeControls: React.FC<ViewModeControlsProps> = ({
  isPreview,
  onTogglePreview,
  isSplitView = false,
  onToggleSplitView,
}) => {
  const { t } = useI18n();

  return (
    <>
      {/* Preview / Edit Toggle (Hidden when Split View is enabled) */}
      {!isSplitView && (
        <>
          <div className="w-px h-4 bg-black/10 dark:bg-white/10 shrink-0" />
          <button
            onClick={onTogglePreview}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition flex items-center gap-1 shrink-0 cursor-pointer"
            title={isPreview ? 'Switch to Edit' : 'Switch to Preview'}
          >
            {isPreview ? (
              <Edit3 className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
            )}
            <span className="text-[11px] whitespace-nowrap">
              {isPreview ? t('edit') : t('preview')}
            </span>
          </button>
        </>
      )}

      {/* Split View Switch Toggle */}
      {onToggleSplitView && (
        <>
          <div className="w-px h-4 bg-black/10 dark:bg-white/10 shrink-0" />
          <button
            onClick={onToggleSplitView}
            className={`p-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 border cursor-pointer ${
              isSplitView
                ? 'bg-[var(--accent-primary)]/15 dark:bg-[var(--accent-primary)]/20 border-[var(--accent-primary)]/40 text-[var(--accent-primary-dark)] dark:text-[var(--accent-primary-light)] shadow-sm'
                : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300'
            }`}
            title={t('splitView')}
          >
            <Columns2
              className={`w-3.5 h-3.5 ${isSplitView ? 'text-[var(--accent-primary)]' : 'text-zinc-500 dark:text-zinc-400'} shrink-0`}
            />
            {/* Visual Switch Pill */}
            <div
              className={`w-7 h-3.5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                isSplitView ? 'bg-[var(--accent-primary)] justify-end' : 'bg-zinc-300 dark:bg-zinc-700 justify-start'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-md transition-all" />
            </div>
          </button>
        </>
      )}
    </>
  );
};

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
          <div className="w-px h-4 bg-white/10 shrink-0" />
          <button
            onClick={onTogglePreview}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 transition flex items-center gap-1 shrink-0 cursor-pointer"
            title={isPreview ? 'Switch to Edit' : 'Switch to Preview'}
          >
            {isPreview ? (
              <Edit3 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-blue-400 shrink-0" />
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
            <Columns2
              className={`w-3.5 h-3.5 ${isSplitView ? 'text-blue-400' : 'text-zinc-400'} shrink-0`}
            />
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
  );
};

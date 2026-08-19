import React from 'react';
import { useI18n } from '../../i18n/i18nContext';
import { DetectedTableRange } from '../../utils/TableConverter';

interface LineGutterProps {
  lines: string[];
  lineHeights: number[];
  activeLineIndex: number;
  documentTables: DetectedTableRange[];
  onSelectLine: (lineIndex: number) => void;
  onOpenTableAtRange: (tableRange: DetectedTableRange) => void;
}

export const LineGutter: React.FC<LineGutterProps> = ({
  lines,
  lineHeights,
  activeLineIndex,
  documentTables,
  onSelectLine,
  onOpenTableAtRange,
}) => {
  const { t } = useI18n();

  return (
    <div className="w-20 pl-1.5 pr-2.5 text-right select-none font-editor-mono font-mono text-xs leading-6 shrink-0 border-r border-black/5 dark:border-white/5 space-y-0 relative">
      {lines.map((_, i) => {
        const isActive = activeLineIndex === i;
        const tableAtLine = documentTables.find((tbl) => tbl.startLine === i);

        return (
          <div
            key={i}
            onClick={() => onSelectLine(i)}
            style={{ height: lineHeights[i] ? `${lineHeights[i]}px` : '24px' }}
            className={`relative flex items-start justify-end leading-6 transition-all duration-150 cursor-gutter ${
              isActive
                ? 'text-primaryColor-600 dark:text-primaryColor-400 font-bold opacity-100 scale-105'
                : 'text-zinc-400 dark:text-zinc-500 opacity-50 hover:opacity-100'
            }`}
          >
            {/* Floating Table Action Button on the left side of table first row line number */}
            {tableAtLine && (
              <div className="absolute left-0 top-0.5 z-30 flex items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenTableAtRange(tableAtLine);
                  }}
                  className="px-1.5 py-0.5 rounded bg-primaryColor-600/90 hover:bg-primaryColor-500 text-white text-[10px] font-sans font-medium shadow-md shadow-primaryColor-500/30 border border-primaryColor-400/30 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
                  title={t('visualTableEditor') || 'Visual Table Editor'}
                >
                  <span>{t('convertToVisualTable') || 'Visual Edit'}</span>
                </button>
              </div>
            )}
            <span>{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
};

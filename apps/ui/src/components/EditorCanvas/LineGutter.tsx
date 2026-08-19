import React from 'react';
import { useI18n } from '../../i18n/i18nContext';
import { DetectedTableRange } from '../../utils/TableConverter';
import { EditorHeightMap } from './types/HeightMap.types';

interface LineGutterProps {
  /** In-memory geometric index containing line coordinates and cumulative offsets */
  heightMap: EditorHeightMap;
  /** Active 0-indexed line index where the user's cursor / caret currently resides */
  activeLineIndex: number;
  /** Detected markdown tables for quick inline visual table conversion */
  documentTables: DetectedTableRange[];
  /** Callback when user clicks on a line number to place cursor or select */
  onSelectLine: (lineIndex: number) => void;
  /** Callback to open the visual table editor dialog */
  onOpenTableAtRange: (tableRange: DetectedTableRange) => void;
}

/**
 * LineGutter — Independent DOM Layer with Absolute Coordinate Mapping
 *
 * Implements physically isolated layer rendering:
 * 1. Independent container with fixed width and cumulative height mapping.
 * 2. Every line number node is absolutely anchored at `top: coord.top px` with exact `height: coord.height px`.
 * 3. Eliminates all cumulative flow rounding drift, ensuring permanent 1:1 alignment with the editor textarea across all soft-wrapping rows.
 */
export const LineGutter: React.FC<LineGutterProps> = ({
  heightMap,
  activeLineIndex,
  documentTables,
  onSelectLine,
  onOpenTableAtRange,
}) => {
  const { t } = useI18n();

  return (
    <div
      className="w-4 sm:w-20 pl-1.5 pr-2.5 text-right select-none font-editor-mono font-mono text-xs leading-6 shrink-0 border-r border-black/5 dark:border-white/5 relative will-change-transform"
      style={{
        height: `${heightMap.totalHeight}px`,
        minHeight: '100%',
      }}
      aria-hidden="true"
    >
      {heightMap.coordinates.map((coord) => {
        const i = coord.lineIndex;
        const isActive = activeLineIndex === i;
        const tableAtLine = documentTables.find((tbl) => tbl.startLine === i);

        return (
          <div
            key={i}
            onClick={() => onSelectLine(i)}
            style={{
              position: 'absolute',
              top: `${coord.top}px`,
              height: `${coord.height}px`,
              left: 0,
              right: '10px',
            }}
            className={`flex items-start justify-end leading-6 transition-colors duration-150 cursor-gutter ${
              isActive
                ? 'text-primaryColor-600 dark:text-primaryColor-400 font-bold opacity-100'
                : 'text-zinc-400 dark:text-zinc-500 opacity-50 hover:opacity-100'
            }`}
          >
            {/* Floating Visual Table Editor button on first row of table */}
            {tableAtLine && (
              <div className="absolute left-1 top-0.5 z-30 flex items-center">
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
            <span>{coord.lineNumber}</span>
          </div>
        );
      })}
    </div>
  );
};

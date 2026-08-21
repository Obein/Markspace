import React from 'react';
import { EditorHeader } from './EditorHeader';
import { FormattingToolbar } from './FormattingToolbar';

export interface EditorHeaderBarProps {
  title: string;
  onTitleChange: (title: string) => void;
  category: string;
  isFullWidth: boolean;
  onToggleFullWidth: () => void;
  hasFormattingToolbar: boolean;
  onInsertFormatting: (prefix: string, suffix?: string, isBlock?: boolean) => void;
  onOpenVisualTable: () => void;
  onToggleFindReplace: () => void;
  isFindOpen: boolean;
}

/**
 * EditorHeaderBar
 * Floating glass header bar containing document title, full-width toggle, and desktop formatting toolbar.
 */
export const EditorHeaderBar: React.FC<EditorHeaderBarProps> = ({
  title,
  onTitleChange,
  category,
  isFullWidth,
  onToggleFullWidth,
  hasFormattingToolbar,
  onInsertFormatting,
  onOpenVisualTable,
  onToggleFindReplace,
  isFindOpen,
}) => {
  return (
    <div className="absolute top-0 inset-x-0 z-30 px-6 pt-3 pb-2.5 glass-bar backdrop-blur-[10px] border-b border-black/5 dark:border-white/10 flex flex-col justify-center space-y-2 shadow-md pointer-events-auto min-h-[52px]">
      <EditorHeader
        title={title}
        onTitleChange={onTitleChange}
        category={category}
        isFullWidth={isFullWidth}
        onToggleFullWidth={onToggleFullWidth}
        showFullWidthToggle={category === 'markdown'}
      />

      {hasFormattingToolbar && (
        <div className="hidden md:flex">
          <FormattingToolbar
            onInsertFormatting={onInsertFormatting}
            onOpenVisualTable={onOpenVisualTable}
            onToggleFindReplace={onToggleFindReplace}
            isFindOpen={isFindOpen}
          />
        </div>
      )}
    </div>
  );
};

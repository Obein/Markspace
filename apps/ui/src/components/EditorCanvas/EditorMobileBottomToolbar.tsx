import React from 'react';
import { FormattingToolbar } from './FormattingToolbar';

export interface EditorMobileBottomToolbarProps {
  hasFormattingToolbar: boolean;
  onInsertFormatting: (prefix: string, suffix?: string, isBlock?: boolean) => void;
  onOpenVisualTable: () => void;
  onToggleFindReplace: () => void;
  isFindOpen: boolean;
}

/**
 * EditorMobileBottomToolbar
 * Sticky formatting toolbar docked at bottom on small screen devices.
 */
export const EditorMobileBottomToolbar: React.FC<EditorMobileBottomToolbarProps> = ({
  hasFormattingToolbar,
  onInsertFormatting,
  onOpenVisualTable,
  onToggleFindReplace,
  isFindOpen,
}) => {
  if (!hasFormattingToolbar) return null;

  return (
    <div className="flex md:hidden absolute bottom-0 inset-x-0 z-30 pl-8 pr-3 pt-1 pb-1 glass-bar backdrop-blur-[10px] shadow-md pointer-events-auto">
      <FormattingToolbar
        onInsertFormatting={onInsertFormatting}
        onOpenVisualTable={onOpenVisualTable}
        onToggleFindReplace={onToggleFindReplace}
        isFindOpen={isFindOpen}
      />
    </div>
  );
};

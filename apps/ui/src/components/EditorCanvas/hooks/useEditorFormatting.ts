import { useCallback } from 'react';
import { useVisualTable } from './useVisualTable';
import { applyMarkdownFormatting } from '../utils/markdownFormatter';
import { getLineSelectionRange } from '../utils/lineSelection';

export interface UseEditorFormattingOptions {
  content: string;
  category: string;
  onContentChange: (newContent: string) => void;
  handleSelectionChange: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * useEditorFormatting
 * Facade Hook coordinating markdown syntax formatting, visual table editing,
 * and line-gutter selection navigation.
 */
export function useEditorFormatting({
  content,
  category,
  onContentChange,
  handleSelectionChange,
  textareaRef,
}: UseEditorFormattingOptions) {
  // Sub-concern 1: Visual Table Detection & Modal Management
  const {
    documentTables,
    isVisualTableOpen,
    activeTableRange,
    setActiveTableRange,
    setIsVisualTableOpen,
    handleOpenVisualTable,
    handleSaveVisualTable,
    handleCloseVisualTable,
  } = useVisualTable({
    content,
    category,
    onContentChange,
    textareaRef,
  });

  // Sub-concern 2: Smart Bidirectional Formatting Insertion
  const insertFormatting = useCallback(
    (prefix: string, suffix = '', isBlock = false) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const result = applyMarkdownFormatting({
        content,
        start,
        end,
        prefix,
        suffix,
        isBlock,
      });

      onContentChange(result.nextContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
        handleSelectionChange();
      }, 0);
    },
    [content, onContentChange, handleSelectionChange, textareaRef]
  );

  // Sub-concern 3: Line-Gutter Selection
  const handleSelectLine = useCallback(
    (lineIndex: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const range = getLineSelectionRange(content, lineIndex);
      if (!range) return;

      textarea.focus();
      textarea.setSelectionRange(range.startOffset, range.endOffset);
      handleSelectionChange();
    },
    [content, handleSelectionChange, textareaRef]
  );

  return {
    documentTables,
    isVisualTableOpen,
    activeTableRange,
    setActiveTableRange,
    setIsVisualTableOpen,
    insertFormatting,
    handleOpenVisualTable,
    handleSaveVisualTable,
    handleCloseVisualTable,
    handleSelectLine,
  };
}

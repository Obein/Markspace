import { useState, useMemo, useCallback } from 'react';
import {
  findTableAtCursor,
  findAllTablesInDocument,
  DetectedTableRange,
} from '../../../utils/TableConverter';

interface UseEditorFormattingOptions {
  content: string;
  category: string;
  onContentChange: (newContent: string) => void;
  handleSelectionChange: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function useEditorFormatting({
  content,
  category,
  onContentChange,
  handleSelectionChange,
  textareaRef,
}: UseEditorFormattingOptions) {
  // Visual Table Editor Modal State
  const [isVisualTableOpen, setIsVisualTableOpen] = useState(false);
  const [activeTableRange, setActiveTableRange] = useState<DetectedTableRange | null>(null);

  // Live document-wide table detection
  const documentTables = useMemo(() => {
    if (category !== 'markdown') return [];
    return findAllTablesInDocument(content);
  }, [content, category]);

  // Insert markdown formatting wrapper
  const insertFormatting = useCallback(
    (prefix: string, suffix = '', isBlock = false) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.substring(start, end);

      let replacement = '';
      let newCursorPos = 0;

      if (isBlock) {
        const beforeCursor = content.substring(0, start);
        const afterCursor = content.substring(end);
        const needsLeadingNewline = beforeCursor.length > 0 && !beforeCursor.endsWith('\n\n');
        const lead = needsLeadingNewline ? '\n\n' : '';
        replacement = `${lead}${prefix}${selectedText}${suffix}\n`;
        onContentChange(beforeCursor + replacement + afterCursor);
        newCursorPos = start + lead.length + prefix.length + selectedText.length;
      } else {
        replacement = `${prefix}${selectedText || 'text'}${suffix}`;
        onContentChange(content.substring(0, start) + replacement + content.substring(end));
        newCursorPos = selectedText ? start + replacement.length : start + prefix.length;
      }

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          selectedText ? newCursorPos : start + prefix.length,
          selectedText ? newCursorPos : start + prefix.length + (selectedText ? 0 : 4)
        );
        handleSelectionChange();
      }, 0);
    },
    [content, onContentChange, handleSelectionChange, textareaRef]
  );

  // Open Visual Table Editor
  const handleOpenVisualTable = useCallback(() => {
    const textarea = textareaRef.current;
    const cursorOffset = textarea?.selectionStart ?? 0;
    const detected = findTableAtCursor(content, cursorOffset);

    if (detected) {
      setActiveTableRange(detected);
      setIsVisualTableOpen(true);
    } else {
      const start = textarea?.selectionStart ?? content.length;
      const end = textarea?.selectionEnd ?? content.length;

      setActiveTableRange({
        startOffset: start,
        endOffset: end,
        startLine: 0,
        endLine: 0,
        tableMarkdown: '',
        parsed: {
          headers: ['', '', ''],
          alignments: ['left', 'left', 'left'],
          rows: [
            ['', '', ''],
            ['', '', ''],
          ],
        },
      });
      setIsVisualTableOpen(true);
    }
  }, [content, textareaRef]);

  const handleSaveVisualTable = useCallback(
    (newTableMd: string) => {
      if (!activeTableRange) return;
      const before = content.substring(0, activeTableRange.startOffset);
      const after = content.substring(activeTableRange.endOffset);
      const nextContent = before + newTableMd + after;
      onContentChange(nextContent);
      setIsVisualTableOpen(false);
      setActiveTableRange(null);
    },
    [content, activeTableRange, onContentChange]
  );

  const handleCloseVisualTable = useCallback(() => {
    setIsVisualTableOpen(false);
    setActiveTableRange(null);
  }, []);

  // Select entire line on clicking line number in gutter
  const handleSelectLine = useCallback(
    (lineIndex: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const linesArr = content.split('\n');
      if (lineIndex < 0 || lineIndex >= linesArr.length) return;

      let startOffset = 0;
      for (let i = 0; i < lineIndex; i++) {
        startOffset += linesArr[i].length + 1;
      }

      const lineLen = linesArr[lineIndex].length;
      const hasNewline = lineIndex < linesArr.length - 1;
      const endOffset = startOffset + lineLen + (hasNewline ? 1 : 0);

      textarea.focus();
      textarea.setSelectionRange(startOffset, endOffset);
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

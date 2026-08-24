import { useState, useMemo, useCallback } from 'react';
import {
  findTableAtCursor,
  findAllTablesInDocument,
  isMarkdownTableRow,
  parseMarkdownTable,
  DetectedTableRange,
} from '../../../utils/TableConverter';

export interface UseVisualTableOptions {
  content: string;
  category: string;
  onContentChange: (newContent: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function useVisualTable({
  content,
  category,
  onContentChange,
  textareaRef,
}: UseVisualTableOptions) {
  // Visual Table Editor Modal State
  const [isVisualTableOpen, setIsVisualTableOpen] = useState(false);
  const [activeTableRange, setActiveTableRange] = useState<DetectedTableRange | null>(null);

  // Live document-wide table detection
  const documentTables = useMemo(() => {
    if (category !== 'markdown') return [];
    return findAllTablesInDocument(content);
  }, [content, category]);

  // Open Visual Table Editor
  const handleOpenVisualTable = useCallback(
    (specificTableRange?: DetectedTableRange) => {
      // 1. If explicitly passed a detected table range (e.g. from LineGutter click), use it directly
      if (specificTableRange) {
        setActiveTableRange(specificTableRange);
        setIsVisualTableOpen(true);
        return;
      }

      const textarea = textareaRef.current;
      const start = textarea?.selectionStart ?? 0;
      const end = textarea?.selectionEnd ?? 0;
      const selectedText = content.substring(start, end).trim();

      // 2. Check if user has highlighted/selected an existing markdown table
      if (selectedText.length > 0 && isMarkdownTableRow(selectedText)) {
        const parsed = parseMarkdownTable(selectedText);
        setActiveTableRange({
          startOffset: start,
          endOffset: end,
          startLine: 0,
          endLine: 0,
          tableMarkdown: selectedText,
          parsed,
        });
        setIsVisualTableOpen(true);
        return;
      }

      // 3. Detect table under or adjacent to cursor position
      const detected = findTableAtCursor(content, start);
      if (detected) {
        setActiveTableRange(detected);
        setIsVisualTableOpen(true);
        return;
      }

      // 4. Fallback: generate a fresh template table at cursor
      setActiveTableRange({
        startOffset: start,
        endOffset: end,
        startLine: 0,
        endLine: 0,
        tableMarkdown: '',
        parsed: {
          headers: ['Header 1', 'Header 2', 'Header 3'],
          alignments: ['left', 'left', 'left'],
          rows: [
            ['', '', ''],
            ['', '', ''],
          ],
        },
      });
      setIsVisualTableOpen(true);
    },
    [content, textareaRef]
  );

  const handleSaveVisualTable = useCallback(
    (newTableMd: string) => {
      if (!activeTableRange) return;
      const before = content.substring(0, activeTableRange.startOffset);
      const after = content.substring(activeTableRange.endOffset);

      let formattedTable = newTableMd;
      if (activeTableRange.tableMarkdown === '') {
        const needLeadingNewline =
          before.length > 0 && !before.endsWith('\n\n')
            ? before.endsWith('\n')
              ? '\n'
              : '\n\n'
            : '';
        const needTrailingNewline =
          after.length > 0 && !after.startsWith('\n\n')
            ? after.startsWith('\n')
              ? '\n'
              : '\n\n'
            : '';
        formattedTable = needLeadingNewline + newTableMd + needTrailingNewline;
      }

      const nextContent = before + formattedTable + after;
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

  return {
    documentTables,
    isVisualTableOpen,
    activeTableRange,
    setActiveTableRange,
    setIsVisualTableOpen,
    handleOpenVisualTable,
    handleSaveVisualTable,
    handleCloseVisualTable,
  };
}

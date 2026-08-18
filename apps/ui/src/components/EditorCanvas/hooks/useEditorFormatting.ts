import { useState, useMemo, useCallback } from 'react';
import {
  findTableAtCursor,
  findAllTablesInDocument,
  isMarkdownTableRow,
  parseMarkdownTable,
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

  /**
   * Smart bidirectional formatting applicator and toggler.
   * If the selected text (or surrounding context) already contains the target markdown syntax,
   * it unwraps and strips the element syntax rather than nesting it.
   *
   * @param prefix - Starting syntax token (e.g., '**', '`', '# ')
   * @param suffix - Ending syntax token (e.g., '**', '`', '')
   * @param isBlock - Whether the formatting is a multiline block (e.g., code fence, LaTeX)
   */
  const insertFormatting = useCallback(
    (prefix: string, suffix = '', isBlock = false) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.substring(start, end);
      const beforeCursor = content.substring(0, start);
      const afterCursor = content.substring(end);

      // --- 1. Line-based prefix toggling (Headings: '# ', '## ', '### ', Lists: '- ', Blockquotes: '> ') ---
      if (prefix && !suffix && !isBlock) {
        const lastNewlineBefore = beforeCursor.lastIndexOf('\n');
        const lineStart = lastNewlineBefore === -1 ? 0 : lastNewlineBefore + 1;
        const firstNewlineAfter = afterCursor.indexOf('\n');
        const lineEnd = firstNewlineAfter === -1 ? content.length : end + firstNewlineAfter;

        const fullBlock = content.substring(lineStart, lineEnd);
        const lines = fullBlock.split('\n');

        const isHeading = prefix.startsWith('#');
        const isListOrQuote = prefix === '- ' || prefix === '> ';

        if (isHeading) {
          const headingRegex = /^(#{1,6}\s+)/;
          const updatedLines = lines.map((line) => {
            const match = line.match(headingRegex);
            if (match) {
              if (match[1] === prefix) {
                // Exact match: Strip heading syntax
                return line.substring(match[1].length);
              } else {
                // Different heading level: Switch to the requested level
                return prefix + line.substring(match[1].length);
              }
            } else {
              return prefix + line;
            }
          });
          const newBlock = updatedLines.join('\n');
          onContentChange(content.substring(0, lineStart) + newBlock + content.substring(lineEnd));
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart + newBlock.length);
            handleSelectionChange();
          }, 0);
          return;
        }

        if (isListOrQuote) {
          const allHavePrefix = lines.every((line) => line.startsWith(prefix));
          const updatedLines = lines.map((line) => {
            if (allHavePrefix) {
              // Strip prefix from all lines
              return line.substring(prefix.length);
            } else {
              return line.startsWith(prefix) ? line : prefix + line;
            }
          });
          const newBlock = updatedLines.join('\n');
          onContentChange(content.substring(0, lineStart) + newBlock + content.substring(lineEnd));
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart + newBlock.length);
            handleSelectionChange();
          }, 0);
          return;
        }
      }

      // --- 2. Block code / LaTeX / Mermaid toggling ---
      if (isBlock) {
        const trimmedSelected = selectedText.trim();
        const isSelectedCodeBlock =
          prefix.startsWith('```') &&
          trimmedSelected.startsWith('```') &&
          trimmedSelected.endsWith('```');
        const isSelectedLatexBlock =
          prefix.startsWith('$$') &&
          trimmedSelected.startsWith('$$') &&
          trimmedSelected.endsWith('$$');

        if (isSelectedCodeBlock || isSelectedLatexBlock) {
          // Unwrap directly selected block
          let inner = trimmedSelected;
          if (inner.startsWith('```')) {
            inner = inner.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '');
          } else if (inner.startsWith('$$')) {
            inner = inner.replace(/^\$\$\n?/, '').replace(/\n?\$\$$/, '');
          }
          onContentChange(beforeCursor + inner + afterCursor);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start, start + inner.length);
            handleSelectionChange();
          }, 0);
          return;
        }

        // Check if cursor/selection is nested inside a code block fence
        const codeBlockStart = beforeCursor.lastIndexOf('```');
        const codeBlockEnd = afterCursor.indexOf('```');
        if (
          prefix.startsWith('```') &&
          codeBlockStart !== -1 &&
          codeBlockEnd !== -1 &&
          !beforeCursor.substring(codeBlockStart + 3).includes('```') &&
          !afterCursor.substring(0, codeBlockEnd).includes('```')
        ) {
          const blockStartPos = codeBlockStart;
          const blockEndPos = end + codeBlockEnd + 3;
          let fullBlock = content.substring(blockStartPos, blockEndPos);
          fullBlock = fullBlock.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '');
          onContentChange(
            content.substring(0, blockStartPos) + fullBlock + content.substring(blockEndPos)
          );
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(blockStartPos, blockStartPos + fullBlock.length);
            handleSelectionChange();
          }, 0);
          return;
        }

        // Insert block formatting
        const needsLeadingNewline = beforeCursor.length > 0 && !beforeCursor.endsWith('\n\n');
        const lead = needsLeadingNewline ? (beforeCursor.endsWith('\n') ? '\n' : '\n\n') : '';
        const replacement = `${lead}${prefix}${selectedText}${suffix}\n`;
        onContentChange(beforeCursor + replacement + afterCursor);
        const newCursorPos = start + lead.length + prefix.length + selectedText.length;
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          handleSelectionChange();
        }, 0);
        return;
      }

      // --- 3. Inline formatting toggling (Bold: '**', Italic: '*', Strikethrough: '~~', Inline Code: '`', Link: '[') ---
      if (prefix && suffix) {
        const isItalic = prefix === '*' && suffix === '*';
        const isBold = prefix === '**' && suffix === '**';

        // Check Case 3A: selectedText itself starts with prefix and ends with suffix
        let hasDirectWrap = false;
        if (isItalic) {
          hasDirectWrap =
            selectedText.startsWith('*') &&
            selectedText.endsWith('*') &&
            !selectedText.startsWith('**') &&
            !selectedText.endsWith('**') &&
            selectedText.length >= 2;
        } else if (isBold) {
          hasDirectWrap =
            selectedText.startsWith('**') &&
            selectedText.endsWith('**') &&
            selectedText.length >= 4;
        } else {
          hasDirectWrap =
            selectedText.startsWith(prefix) &&
            selectedText.endsWith(suffix) &&
            selectedText.length >= prefix.length + suffix.length;
        }

        if (hasDirectWrap) {
          // Unwrap element syntax from selected text
          const unwrapped = selectedText.slice(prefix.length, -suffix.length);
          onContentChange(beforeCursor + unwrapped + afterCursor);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start, start + unwrapped.length);
            handleSelectionChange();
          }, 0);
          return;
        }

        // Check Case 3B: surrounding context immediately outside selection matches prefix and suffix
        let hasSurroundingWrap = false;
        if (isItalic) {
          hasSurroundingWrap =
            beforeCursor.endsWith('*') &&
            afterCursor.startsWith('*') &&
            !beforeCursor.endsWith('**') &&
            !afterCursor.startsWith('**');
        } else if (isBold) {
          hasSurroundingWrap = beforeCursor.endsWith('**') && afterCursor.startsWith('**');
        } else {
          hasSurroundingWrap = beforeCursor.endsWith(prefix) && afterCursor.startsWith(suffix);
        }

        if (hasSurroundingWrap) {
          // Remove surrounding prefix and suffix
          const newBefore = beforeCursor.slice(0, -prefix.length);
          const newAfter = afterCursor.slice(suffix.length);
          onContentChange(newBefore + selectedText + newAfter);
          const newStart = start - prefix.length;
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newStart, newStart + selectedText.length);
            handleSelectionChange();
          }, 0);
          return;
        }

        // Check Case 3C: Markdown Link unwrapping if selectedText matches [linkText](url)
        if (prefix === '[' && suffix === '](url)') {
          const linkRegex = /^\[([^\]]*)\]\([^)]*\)$/;
          const linkMatch = selectedText.match(linkRegex);
          if (linkMatch) {
            const linkText = linkMatch[1] || '';
            onContentChange(beforeCursor + linkText + afterCursor);
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(start, start + linkText.length);
              handleSelectionChange();
            }, 0);
            return;
          }
        }

        // Otherwise, wrap selection with prefix and suffix
        const replacement = `${prefix}${selectedText || 'text'}${suffix}`;
        onContentChange(beforeCursor + replacement + afterCursor);
        setTimeout(() => {
          textarea.focus();
          if (selectedText) {
            textarea.setSelectionRange(start, start + replacement.length);
          } else {
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + 4);
          }
          handleSelectionChange();
        }, 0);
        return;
      }
    },
    [content, onContentChange, handleSelectionChange, textareaRef]
  );

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

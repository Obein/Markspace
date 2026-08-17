import React from 'react';

export function useSmartList(
  category: string,
  onContentChange: (content: string) => void,
  handleSelectionChange: () => void,
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
) {
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (category !== 'markdown') return;

    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const val = textarea.value;
      const pos = textarea.selectionStart;

      // Find current line text up to cursor
      const lastNewline = val.lastIndexOf('\n', pos - 1);
      const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
      const currentLine = val.substring(lineStart, pos);

      // 1. Task list item: - [ ] or * [ ] or + [ ]
      const taskMatch = currentLine.match(/^(\s*)([-*+])\s+\[([ xX])\]\s*(.*)$/);
      if (taskMatch) {
        e.preventDefault();
        const indent = taskMatch[1];
        const bullet = taskMatch[2];
        const textAfter = taskMatch[4];

        if (textAfter.trim() === '') {
          // Empty task item: cancel task item prefix
          const before = val.substring(0, lineStart);
          const after = val.substring(pos);
          const newContent = before + after;
          onContentChange(newContent);
          setTimeout(() => {
            textarea.selectionStart = lineStart;
            textarea.selectionEnd = lineStart;
            handleSelectionChange();
          }, 0);
        } else {
          // Insert new task item
          const insertText = `\n${indent}${bullet} [ ] `;
          document.execCommand('insertText', false, insertText);
          handleSelectionChange();
        }
        return;
      }

      // 2. Unordered bullet list item: - or * or +
      const unorderedMatch = currentLine.match(/^(\s*)([-*+])\s+(.*)$/);
      if (unorderedMatch) {
        e.preventDefault();
        const indent = unorderedMatch[1];
        const bullet = unorderedMatch[2];
        const textAfter = unorderedMatch[3];

        if (textAfter.trim() === '') {
          // Empty bullet item: cancel bullet prefix
          const before = val.substring(0, lineStart);
          const after = val.substring(pos);
          const newContent = before + after;
          onContentChange(newContent);
          setTimeout(() => {
            textarea.selectionStart = lineStart;
            textarea.selectionEnd = lineStart;
            handleSelectionChange();
          }, 0);
        } else {
          // Insert next bullet item
          const insertText = `\n${indent}${bullet} `;
          document.execCommand('insertText', false, insertText);
          handleSelectionChange();
        }
        return;
      }

      // 3. Ordered numbered list item: 1. or 1)
      const orderedMatch = currentLine.match(/^(\s*)(\d+)(\.|\))\s+(.*)$/);
      if (orderedMatch) {
        e.preventDefault();
        const indent = orderedMatch[1];
        const num = parseInt(orderedMatch[2], 10);
        const delimiter = orderedMatch[3];
        const textAfter = orderedMatch[4];

        if (textAfter.trim() === '') {
          // Empty number item: cancel number prefix
          const before = val.substring(0, lineStart);
          const after = val.substring(pos);
          const newContent = before + after;
          onContentChange(newContent);
          setTimeout(() => {
            textarea.selectionStart = lineStart;
            textarea.selectionEnd = lineStart;
            handleSelectionChange();
          }, 0);
        } else {
          // Insert next ordered list number (increment by 1)
          const insertText = `\n${indent}${num + 1}${delimiter} `;
          document.execCommand('insertText', false, insertText);
          handleSelectionChange();
        }
        return;
      }
    }
  };

  return { handleEditorKeyDown };
}

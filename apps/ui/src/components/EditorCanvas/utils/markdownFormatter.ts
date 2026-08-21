export interface ApplyFormattingParams {
  content: string;
  start: number;
  end: number;
  prefix: string;
  suffix?: string;
  isBlock?: boolean;
}

export interface ApplyFormattingResult {
  nextContent: string;
  selectionStart: number;
  selectionEnd: number;
}

/**
 * applyMarkdownFormatting
 * Pure formatting syntax transformer supporting toggles, replacements,
 * multiline block fences, and inline markdown wrapping/unwrapping.
 */
export function applyMarkdownFormatting({
  content,
  start,
  end,
  prefix,
  suffix = '',
  isBlock = false,
}: ApplyFormattingParams): ApplyFormattingResult {
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
      return {
        nextContent: content.substring(0, lineStart) + newBlock + content.substring(lineEnd),
        selectionStart: lineStart,
        selectionEnd: lineStart + newBlock.length,
      };
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
      return {
        nextContent: content.substring(0, lineStart) + newBlock + content.substring(lineEnd),
        selectionStart: lineStart,
        selectionEnd: lineStart + newBlock.length,
      };
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
      return {
        nextContent: beforeCursor + inner + afterCursor,
        selectionStart: start,
        selectionEnd: start + inner.length,
      };
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
      return {
        nextContent:
          content.substring(0, blockStartPos) + fullBlock + content.substring(blockEndPos),
        selectionStart: blockStartPos,
        selectionEnd: blockStartPos + fullBlock.length,
      };
    }

    // Insert block formatting
    const needsLeadingNewline = beforeCursor.length > 0 && !beforeCursor.endsWith('\n\n');
    const lead = needsLeadingNewline ? (beforeCursor.endsWith('\n') ? '\n' : '\n\n') : '';
    const replacement = `${lead}${prefix}${selectedText}${suffix}\n`;
    const newCursorPos = start + lead.length + prefix.length + selectedText.length;
    return {
      nextContent: beforeCursor + replacement + afterCursor,
      selectionStart: newCursorPos,
      selectionEnd: newCursorPos,
    };
  }

  // --- 3. Inline formatting toggling (Bold: '**', Italic: '*', Strikethrough: '~~', Inline Code: '`', Link: '[') ---
  if (prefix && suffix) {
    const isItalic = prefix === '*' && suffix === '*';
    const isBold = prefix === '**' && suffix === '**';

    // Case 3A: selectedText itself starts with prefix and ends with suffix
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
      return {
        nextContent: beforeCursor + unwrapped + afterCursor,
        selectionStart: start,
        selectionEnd: start + unwrapped.length,
      };
    }

    // Case 3B: surrounding context immediately outside selection matches prefix and suffix
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
      const newStart = start - prefix.length;
      return {
        nextContent: newBefore + selectedText + newAfter,
        selectionStart: newStart,
        selectionEnd: newStart + selectedText.length,
      };
    }

    // Case 3C: Markdown Link unwrapping if selectedText matches [linkText](url)
    if (prefix === '[' && suffix === '](url)') {
      const linkRegex = /^\[([^\]]*)\]\([^)]*\)$/;
      const linkMatch = selectedText.match(linkRegex);
      if (linkMatch) {
        const linkText = linkMatch[1] || '';
        return {
          nextContent: beforeCursor + linkText + afterCursor,
          selectionStart: start,
          selectionEnd: start + linkText.length,
        };
      }
    }

    // Otherwise, wrap selection with prefix and suffix
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;
    const targetStart = selectedText
      ? start
      : start + prefix.length;
    const targetEnd = selectedText
      ? start + replacement.length
      : start + prefix.length + 4;

    return {
      nextContent: beforeCursor + replacement + afterCursor,
      selectionStart: targetStart,
      selectionEnd: targetEnd,
    };
  }

  return {
    nextContent: content,
    selectionStart: start,
    selectionEnd: end,
  };
}

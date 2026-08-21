export interface LineSelectionRange {
  startOffset: number;
  endOffset: number;
}

/**
 * getLineSelectionRange
 * Calculates the exact start and end string offsets for a given line index in document text.
 */
export function getLineSelectionRange(
  content: string,
  lineIndex: number
): LineSelectionRange | null {
  const linesArr = content.split('\n');
  if (lineIndex < 0 || lineIndex >= linesArr.length) return null;

  let startOffset = 0;
  for (let i = 0; i < lineIndex; i++) {
    startOffset += linesArr[i].length + 1;
  }

  const lineLen = linesArr[lineIndex].length;
  const hasNewline = lineIndex < linesArr.length - 1;
  const endOffset = startOffset + lineLen + (hasNewline ? 1 : 0);

  return { startOffset, endOffset };
}

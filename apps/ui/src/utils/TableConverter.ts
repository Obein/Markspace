/**
 * TableConverter.ts
 * Utility functions for parsing, detecting, and serializing Markdown tables.
 */

export type TableAlignment = 'left' | 'center' | 'right';

export interface ParsedTableData {
  headers: string[];
  alignments: TableAlignment[];
  rows: string[][];
}

export interface DetectedTableRange {
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  tableMarkdown: string;
  parsed: ParsedTableData;
}

/**
 * Check whether a single line matches standard Markdown table row syntax (| ... |).
 */
export function isMarkdownTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length >= 2;
}

/**
 * Check if a row is a Markdown table separator row (| --- | :---: | ---: |).
 */
export function isMarkdownTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!isMarkdownTableRow(trimmed)) return false;
  const cells = trimmed.split('|').slice(1, -1);
  if (cells.length === 0) return false;
  return cells.every((cell) => /^[:\s]*-+[:\s]*$/.test(cell.trim()));
}

/**
 * Detect if cursor offset resides within a valid Markdown table block.
 */
export function findTableAtCursor(content: string, cursorOffset: number): DetectedTableRange | null {
  if (!content) return null;

  const lines = content.split('\n');
  let currentOffset = 0;
  let cursorLineIndex = 0;

  // Find line index for cursor
  for (let i = 0; i < lines.length; i++) {
    const lineLen = lines[i].length + 1; // +1 for '\n'
    if (cursorOffset >= currentOffset && cursorOffset <= currentOffset + lineLen) {
      cursorLineIndex = i;
      break;
    }
    currentOffset += lineLen;
  }

  // Check if current line is part of a table
  if (!isMarkdownTableRow(lines[cursorLineIndex])) {
    return null;
  }

  // Search upwards for table start
  let startLine = cursorLineIndex;
  while (startLine > 0 && isMarkdownTableRow(lines[startLine - 1])) {
    startLine--;
  }

  // Search downwards for table end
  let endLine = cursorLineIndex;
  while (endLine < lines.length - 1 && isMarkdownTableRow(lines[endLine + 1])) {
    endLine++;
  }

  const tableLines = lines.slice(startLine, endLine + 1);
  if (tableLines.length < 2) {
    return null; // A valid table must have at least header + separator
  }

  // Verify that line 1 is separator
  if (!isMarkdownTableSeparator(tableLines[1])) {
    return null;
  }

  // Calculate start and end offsets in content
  let startOffset = 0;
  for (let i = 0; i < startLine; i++) {
    startOffset += lines[i].length + 1;
  }

  let tableLength = 0;
  for (let i = startLine; i <= endLine; i++) {
    tableLength += lines[i].length;
    if (i < endLine) tableLength += 1; // '\n'
  }
  const endOffset = startOffset + tableLength;

  const tableMarkdown = tableLines.join('\n');
  const parsed = parseMarkdownTable(tableMarkdown);

  return {
    startOffset,
    endOffset,
    startLine,
    endLine,
    tableMarkdown,
    parsed,
  };
}

/**
 * Parse Markdown table string into structured 2D grid and alignments.
 */
export function parseMarkdownTable(tableMarkdown: string): ParsedTableData {
  const lines = tableMarkdown.split('\n').filter((l) => isMarkdownTableRow(l));
  if (lines.length === 0) {
    return {
      headers: ['Header 1', 'Header 2'],
      alignments: ['left', 'left'],
      rows: [['Cell 1', 'Cell 2']],
    };
  }

  const rawHeaders = lines[0]
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());

  let alignments: TableAlignment[] = [];
  if (lines.length > 1 && isMarkdownTableSeparator(lines[1])) {
    alignments = lines[1]
      .split('|')
      .slice(1, -1)
      .map((c) => {
        const cell = c.trim();
        const leftColon = cell.startsWith(':');
        const rightColon = cell.endsWith(':');
        if (leftColon && rightColon) return 'center';
        if (rightColon) return 'right';
        return 'left';
      });
  }

  // Ensure alignments match headers length
  while (alignments.length < rawHeaders.length) {
    alignments.push('left');
  }

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i]
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());

    // Normalize row cells count to headers length
    while (cells.length < rawHeaders.length) {
      cells.push('');
    }
    rows.push(cells.slice(0, rawHeaders.length));
  }

  if (rows.length === 0) {
    rows.push(new Array(rawHeaders.length).fill(''));
  }

  return {
    headers: rawHeaders.length > 0 ? rawHeaders : ['Col 1', 'Col 2'],
    alignments,
    rows,
  };
}

/**
 * Serialize 2D grid back to clean, aligned GitHub Flavored Markdown table syntax.
 */
export function serializeToMarkdownTable(
  headers: string[],
  alignments: TableAlignment[],
  rows: string[][]
): string {
  const colCount = Math.max(headers.length, ...rows.map((r) => r.length), 1);

  // Normalize headers
  const normalizedHeaders = [...headers];
  while (normalizedHeaders.length < colCount) {
    normalizedHeaders.push(`Col ${normalizedHeaders.length + 1}`);
  }

  // Normalize alignments
  const normalizedAlignments: TableAlignment[] = [...alignments];
  while (normalizedAlignments.length < colCount) {
    normalizedAlignments.push('left');
  }

  // Calculate maximum column widths for beautiful padding
  const colWidths = new Array(colCount).fill(3);
  for (let c = 0; c < colCount; c++) {
    colWidths[c] = Math.max(colWidths[c], normalizedHeaders[c]?.length || 3);
  }
  for (const row of rows) {
    for (let c = 0; c < colCount; c++) {
      colWidths[c] = Math.max(colWidths[c], (row[c] || '').length);
    }
  }

  // Build header row
  const headerRow =
    '| ' +
    normalizedHeaders
      .map((h, i) => padCell(h, colWidths[i], normalizedAlignments[i]))
      .join(' | ') +
    ' |';

  // Build separator row
  const separatorRow =
    '| ' +
    normalizedAlignments
      .map((align, i) => {
        const width = Math.max(colWidths[i], 3);
        if (align === 'center') {
          return ':' + '-'.repeat(Math.max(width - 2, 1)) + ':';
        }
        if (align === 'right') {
          return '-'.repeat(Math.max(width - 1, 2)) + ':';
        }
        return ':' + '-'.repeat(Math.max(width - 1, 2));
      })
      .join(' | ') +
    ' |';

  // Build data rows
  const dataRows = rows.map((row) => {
    const normalizedRow = [...row];
    while (normalizedRow.length < colCount) {
      normalizedRow.push('');
    }
    return (
      '| ' +
      normalizedRow
        .map((cell, i) => padCell(cell, colWidths[i], normalizedAlignments[i]))
        .join(' | ') +
      ' |'
    );
  });

  return [headerRow, separatorRow, ...dataRows].join('\n');
}

function padCell(text: string, width: number, align: TableAlignment): string {
  const clean = text || '';
  const diff = Math.max(0, width - clean.length);
  if (align === 'right') {
    return ' '.repeat(diff) + clean;
  }
  if (align === 'center') {
    const leftPad = Math.floor(diff / 2);
    const rightPad = diff - leftPad;
    return ' '.repeat(leftPad) + clean + ' '.repeat(rightPad);
  }
  return clean + ' '.repeat(diff);
}

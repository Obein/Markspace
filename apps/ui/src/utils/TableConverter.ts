/**
 * TableConverter.ts
 * High-precision utility functions for parsing, detecting, and serializing Markdown tables.
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
 * Check whether a single line matches Markdown table row syntax (| ... |).
 */
export function isMarkdownTableRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Must contain pipe character
  return trimmed.includes('|');
}

/**
 * Check if a row is a Markdown table separator row (| --- | :---: | ---: |).
 */
export function isMarkdownTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.includes('-')) return false;

  const parts = trimmed
    .split('|')
    .map((c) => c.trim())
    .filter((c, idx, arr) => {
      // Filter out outermost empty splits if leading/trailing pipes exist
      if ((idx === 0 || idx === arr.length - 1) && c === '') return false;
      return true;
    });

  if (parts.length === 0) return false;
  return parts.every((cell) => /^[:\s]*-+[:\s]*$/.test(cell));
}

/**
 * Detect all valid Markdown tables across the document with exact character offsets.
 */
export function findAllTablesInDocument(content: string): DetectedTableRange[] {
  if (!content) return [];

  const lines = content.split(/\r?\n/);
  const tables: DetectedTableRange[] = [];

  // Pre-calculate line start and end offsets in original content
  const lineOffsets: { start: number; end: number }[] = [];
  let currentOffset = 0;
  for (let idx = 0; idx < lines.length; idx++) {
    const lineLen = lines[idx].length;
    lineOffsets.push({
      start: currentOffset,
      end: currentOffset + lineLen,
    });
    const isCRLF =
      content.substring(currentOffset + lineLen, currentOffset + lineLen + 2) === '\r\n';
    currentOffset += lineLen + (isCRLF ? 2 : 1);
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (
      isMarkdownTableRow(line) &&
      i + 1 < lines.length &&
      isMarkdownTableSeparator(lines[i + 1])
    ) {
      const startLine = i;
      let endLine = i + 1;
      while (
        endLine + 1 < lines.length &&
        isMarkdownTableRow(lines[endLine + 1]) &&
        lines[endLine + 1].trim() !== ''
      ) {
        endLine++;
      }

      const tableLines = lines.slice(startLine, endLine + 1);
      const tableMarkdown = tableLines.join('\n');
      const startOffset = lineOffsets[startLine].start;
      const endOffset = lineOffsets[endLine].end;
      const parsed = parseMarkdownTable(tableMarkdown);

      tables.push({
        startOffset,
        endOffset,
        startLine,
        endLine,
        tableMarkdown,
        parsed,
      });

      i = endLine + 1;
      continue;
    }
    i++;
  }

  return tables;
}

/**
 * Detect if cursor offset resides within a valid Markdown table block.
 */
export function findTableAtCursor(
  content: string,
  cursorOffset: number
): DetectedTableRange | null {
  if (!content) return null;

  const tables = findAllTablesInDocument(content);
  if (tables.length === 0) return null;

  // 1. Direct offset match inside table range
  for (const tbl of tables) {
    if (cursorOffset >= tbl.startOffset && cursorOffset <= tbl.endOffset) {
      return tbl;
    }
  }

  // 2. Immediately adjacent boundary match (1 character offset)
  for (const tbl of tables) {
    if (
      cursorOffset >= tbl.startOffset - 1 &&
      cursorOffset <= tbl.endOffset + 1
    ) {
      return tbl;
    }
  }

  return null;
}

/**
 * Parse Markdown table string into structured 2D grid and alignments.
 */
export function parseMarkdownTable(tableMarkdown: string): ParsedTableData {
  const lines = tableMarkdown
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && isMarkdownTableRow(l));

  if (lines.length === 0) {
    return {
      headers: ['Col 1', 'Col 2'],
      alignments: ['left', 'left'],
      rows: [['', '']],
    };
  }

  const parseRowCells = (rowStr: string): string[] => {
    let cells = rowStr.split('|').map((c) => c.trim());
    if (rowStr.trim().startsWith('|') && cells.length > 0 && cells[0] === '') {
      cells.shift();
    }
    if (rowStr.trim().endsWith('|') && cells.length > 0 && cells[cells.length - 1] === '') {
      cells.pop();
    }
    return cells;
  };

  const rawHeaders = parseRowCells(lines[0]);

  let alignments: TableAlignment[] = [];
  if (lines.length > 1 && isMarkdownTableSeparator(lines[1])) {
    alignments = parseRowCells(lines[1]).map((cell) => {
      const trimmed = cell.trim();
      const leftColon = trimmed.startsWith(':');
      const rightColon = trimmed.endsWith(':');
      if (leftColon && rightColon) return 'center';
      if (rightColon) return 'right';
      return 'left';
    });
  }

  const colCount = Math.max(rawHeaders.length, alignments.length, 1);

  // Normalize headers
  while (rawHeaders.length < colCount) {
    rawHeaders.push(`Col ${rawHeaders.length + 1}`);
  }

  // Normalize alignments
  while (alignments.length < colCount) {
    alignments.push('left');
  }

  const rows: string[][] = [];
  const startRowIdx = lines.length > 1 && isMarkdownTableSeparator(lines[1]) ? 2 : 1;

  for (let i = startRowIdx; i < lines.length; i++) {
    const cells = parseRowCells(lines[i]);
    while (cells.length < colCount) {
      cells.push('');
    }
    rows.push(cells.slice(0, colCount));
  }

  if (rows.length === 0) {
    rows.push(new Array(colCount).fill(''));
  }

  return {
    headers: rawHeaders,
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

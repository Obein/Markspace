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
  if (!trimmed) return false;
  // Must contain pipe and at least 2 cells
  return (trimmed.startsWith('|') || trimmed.endsWith('|') || trimmed.includes('|')) && trimmed.split('|').length >= 3;
}

/**
 * Check if a row is a Markdown table separator row (| --- | :---: | ---: |).
 */
export function isMarkdownTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const parts = trimmed.split('|').map((c) => c.trim()).filter((c, idx, arr) => {
    // If leading/trailing pipes exist, filter out outermost empty splits
    if ((idx === 0 || idx === arr.length - 1) && c === '') return false;
    return true;
  });
  if (parts.length === 0) return false;
  return parts.every((cell) => /^[:\s]*-+[:\s]*$/.test(cell));
}

/**
 * Detect all valid Markdown tables across the document.
 */
export function findAllTablesInDocument(content: string): DetectedTableRange[] {
  if (!content) return [];

  const lines = content.split('\n');
  const tables: DetectedTableRange[] = [];
  let i = 0;
  let runningOffset = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (isMarkdownTableRow(line)) {
      const startLine = i;
      let endLine = i;
      while (endLine + 1 < lines.length && isMarkdownTableRow(lines[endLine + 1])) {
        endLine++;
      }

      const tableLines = lines.slice(startLine, endLine + 1);
      if (tableLines.length >= 2 && isMarkdownTableSeparator(tableLines[1])) {
        const tableMarkdown = tableLines.join('\n');
        const startOffset = runningOffset;
        let tableLen = 0;
        for (let t = startLine; t <= endLine; t++) {
          tableLen += lines[t].length + (t < lines.length - 1 ? 1 : 0);
        }
        const endOffset = startOffset + tableLen;
        const parsed = parseMarkdownTable(tableMarkdown);

        tables.push({
          startOffset,
          endOffset,
          startLine,
          endLine,
          tableMarkdown,
          parsed,
        });

        runningOffset += tableLen;
        i = endLine + 1;
        continue;
      }
    }
    runningOffset += line.length + (i < lines.length - 1 ? 1 : 0);
    i++;
  }

  return tables;
}

/**
 * Detect if cursor offset resides within a valid Markdown table block.
 */
export function findTableAtCursor(content: string, cursorOffset: number): DetectedTableRange | null {
  if (!content) return null;

  const tables = findAllTablesInDocument(content);
  for (const tbl of tables) {
    if (cursorOffset >= tbl.startOffset && cursorOffset <= tbl.endOffset) {
      return tbl;
    }
  }
  return null;
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

  const parseRowCells = (rowStr: string): string[] => {
    let cells = rowStr.split('|').map((c) => c.trim());
    if (rowStr.trim().startsWith('|') && cells[0] === '') {
      cells.shift();
    }
    if (rowStr.trim().endsWith('|') && cells[cells.length - 1] === '') {
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

  // Ensure alignments match headers length
  while (alignments.length < rawHeaders.length) {
    alignments.push('left');
  }

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = parseRowCells(lines[i]);

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

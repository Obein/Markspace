import { ISheetEngine } from '../interfaces/ISheetEngine';

type SheetFunction = (values: number[]) => number;

export class SheetEvaluator implements ISheetEngine {
  private readonly functions: Record<string, SheetFunction> = {
    SUM: (vals) => vals.reduce((a, b) => a + b, 0),
    AVG: (vals) => (vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length),
    AVERAGE: (vals) => (vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length),
    COUNT: (vals) => vals.length,
    MIN: (vals) => (vals.length === 0 ? 0 : Math.min(...vals)),
    MAX: (vals) => (vals.length === 0 ? 0 : Math.max(...vals)),
  };

  /**
   * Parse Markdown tables and evaluate cell formulas.
   */
  evaluateMarkdownFormulas(markdown: string): string {
    const lines = markdown.split('\n');
    let inTable = false;
    let tableLines: string[] = [];
    const resultLines: string[] = [];

    for (const line of lines) {
      const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');

      if (isTableRow) {
        inTable = true;
        tableLines.push(line);
      } else {
        if (inTable) {
          resultLines.push(...this.processTable(tableLines));
          tableLines = [];
          inTable = false;
        }
        resultLines.push(line);
      }
    }

    if (inTable && tableLines.length > 0) {
      resultLines.push(...this.processTable(tableLines));
    }

    return resultLines.join('\n');
  }

  private processTable(rows: string[]): string[] {
    if (rows.length < 2) return rows; // Need header + separator

    const grid: string[][] = rows.map((row) =>
      row
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim())
    );

    const evaluatedGrid: string[][] = grid.map((row) => [...row]);

    // Parse cell values for formula reference
    // Row 0 is header, Row 1 is separator (---)
    // Data rows start at index 2 (1-indexed in sheet as A1, A2...)
    const getCellValue = (colLetter: string, rowNumStr: string): number => {
      const colIndex = colLetter.toUpperCase().charCodeAt(0) - 65;
      const rowIndex = parseInt(rowNumStr, 10) + 1; // offset for header & separator

      if (rowIndex >= 0 && rowIndex < grid.length && colIndex >= 0 && colIndex < grid[rowIndex].length) {
        const val = parseFloat(grid[rowIndex][colIndex]);
        return isNaN(val) ? 0 : val;
      }
      return 0;
    };

    const getRangeValues = (rangeStr: string): number[] => {
      const parts = rangeStr.split(':');
      if (parts.length !== 2) return [];

      const startMatch = parts[0].match(/([A-Z]+)([0-9]+)/i);
      const endMatch = parts[1].match(/([A-Z]+)([0-9]+)/i);

      if (!startMatch || !endMatch) return [];

      const startCol = startMatch[1].toUpperCase().charCodeAt(0) - 65;
      const startRow = parseInt(startMatch[2], 10);
      const endCol = endMatch[1].toUpperCase().charCodeAt(0) - 65;
      const endRow = parseInt(endMatch[2], 10);

      const values: number[] = [];
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const colChar = String.fromCharCode(65 + c);
          values.push(getCellValue(colChar, r.toString()));
        }
      }
      return values;
    };

    // Replace formulas with evaluated values
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (cell.startsWith('=')) {
          const formulaMatch = cell.match(/=([A-Z]+)\(([^)]+)\)/i);
          if (formulaMatch) {
            const funcName = formulaMatch[1].toUpperCase();
            const rangeArg = formulaMatch[2].trim();

            if (this.functions[funcName]) {
              const vals = getRangeValues(rangeArg);
              const computed = this.functions[funcName](vals);
              evaluatedGrid[r][c] = computed.toLocaleString(undefined, { maximumFractionDigits: 2 });
            }
          }
        }
      }
    }

    // Reconstruct Markdown table
    return rows.map((_, rowIndex) => {
      const cells = evaluatedGrid[rowIndex];
      return `| ${cells.join(' | ')} |`;
    });
  }
}

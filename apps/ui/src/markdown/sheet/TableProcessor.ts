import { ExpressionParser } from './ExpressionParser';
import { FormulaPrimitive } from './types';

/**
 * TableProcessor
 * 
 * Extracts Markdown tables from document lines, evaluates cell formulas using multi-pass
 * dependency convergence, and reconstructs formatted Markdown table rows.
 */
export class TableProcessor {
  /** Maximum evaluation passes to resolve chained cell dependencies (e.g. C1 -> B1 -> A1) */
  private static readonly MAX_EVALUATION_PASSES = 8;

  /**
   * Evaluates a single formula cell string (e.g. "=SUM(A1:A5)", "=A1+B1*2").
   * 
   * @param rawFormula Raw formula text starting with '='
   * @param currentGrid Current evaluated grid state
   * @returns Formatted result string, or the raw formula on any calculation or syntax error
   */
  public static evaluateCellFormula(rawFormula: string, currentGrid: string[][]): string {
    if (!rawFormula.startsWith('=')) {
      return rawFormula;
    }

    const expression = rawFormula.slice(1).trim();
    if (!expression) {
      return rawFormula;
    }

    try {
      const result = ExpressionParser.evaluate(expression, currentGrid);

      if (Array.isArray(result) || result === null || result === undefined) {
        return rawFormula;
      }

      return ExpressionParser.formatResult(result as FormulaPrimitive);
    } catch {
      // Graceful fallback to raw formula source on division by zero, invalid args, or syntax errors
      return rawFormula;
    }
  }

  /**
   * Processes a slice of Markdown table rows, parsing the grid, resolving formulas,
   * and returning the evaluated Markdown rows.
   * 
   * @param rows Array of raw Markdown table row strings
   * @returns Array of evaluated Markdown table row strings
   */
  public static processTableRows(rows: string[]): string[] {
    if (rows.length < 2) return rows; // Need at least header + separator rows

    // Split rows into grid cells (trimming outer empty splits from leading/trailing pipes)
    const grid: string[][] = rows.map((row) =>
      row
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim())
    );

    const evaluatedGrid: string[][] = grid.map((row) => [...row]);

    // Multi-pass evaluation to resolve chained dependencies
    for (let pass = 0; pass < this.MAX_EVALUATION_PASSES; pass++) {
      let changed = false;

      // Data rows start at index 2 (Row 0 is header, Row 1 is delimiter/separator)
      for (let r = 2; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          const rawCell = grid[r][c];
          if (rawCell.startsWith('=')) {
            const evaluated = this.evaluateCellFormula(rawCell, evaluatedGrid);
            if (evaluated !== evaluatedGrid[r][c]) {
              evaluatedGrid[r][c] = evaluated;
              changed = true;
            }
          }
        }
      }

      if (!changed) break;
    }

    // Reconstruct Markdown table rows preserving pipe structure
    return rows.map((_, rowIndex) => {
      const cells = evaluatedGrid[rowIndex];
      return `| ${cells.join(' | ')} |`;
    });
  }

  /**
   * Scans a full Markdown document, locates table blocks, and delegates each table to processTableRows.
   * 
   * @param markdown Full markdown content string
   * @returns Processed markdown with computed table formulas
   */
  public static processMarkdown(markdown: string): string {
    if (!markdown || !markdown.includes('|')) {
      return markdown;
    }

    const lines = markdown.split('\n');
    let inTable = false;
    let tableLines: string[] = [];
    const resultLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1;

      if (isTableRow) {
        inTable = true;
        tableLines.push(line);
      } else {
        if (inTable) {
          resultLines.push(...this.processTableRows(tableLines));
          tableLines = [];
          inTable = false;
        }
        resultLines.push(line);
      }
    }

    if (inTable && tableLines.length > 0) {
      resultLines.push(...this.processTableRows(tableLines));
    }

    return resultLines.join('\n');
  }
}

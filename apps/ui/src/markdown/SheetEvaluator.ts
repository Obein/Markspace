import { ISheetEngine } from '../interfaces/ISheetEngine';
import { TableProcessor } from './sheet/TableProcessor';

/**
 * SheetEvaluator
 * 
 * High-level Facade implementing ISheetEngine for parsing Markdown tables
 * and computing embedded spreadsheet cell formulas.
 */
export class SheetEvaluator implements ISheetEngine {
  /**
   * Parses Markdown tables and evaluates cell formulas.
   * In preview/evaluated mode: displays computed results; if calculation errors occur,
   * gracefully falls back to displaying original formula source code.
   * 
   * @param markdown Markdown document string
   * @returns Processed Markdown string with computed formula cells
   */
  public evaluateMarkdownFormulas(markdown: string): string {
    return TableProcessor.processMarkdown(markdown);
  }

  /**
   * Evaluates a single formula string (e.g. "=SUM(A1:A5)", "=A1+B1*2") against a table grid.
   * 
   * @param rawFormula Formula expression starting with '='
   * @param currentGrid 2D grid matrix of current table values
   * @returns Formatted result string, or original raw formula on calculation failure
   */
  public evaluateCellFormula(rawFormula: string, currentGrid: string[][]): string {
    return TableProcessor.evaluateCellFormula(rawFormula, currentGrid);
  }
}

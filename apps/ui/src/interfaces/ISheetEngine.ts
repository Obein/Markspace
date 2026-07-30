export interface ISheetEngine {
  /**
   * Parse Markdown content and evaluate table cell formulas like =SUM(A1:A5), =AVERAGE(B1:B10).
   */
  evaluateMarkdownFormulas(markdown: string): string;
}

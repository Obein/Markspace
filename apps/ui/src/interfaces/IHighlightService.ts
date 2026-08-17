/**
 * Contract for code syntax highlighting service.
 */
export interface IHighlightService {
  /**
   * Highlights a code snippet for a given language tag using AST parsers.
   * Returns HTML string with highlighted syntax tags/classes.
   *
   * @param code Code snippet content
   * @param language Language identifier (js, ts, javascript, python, json, html, css, etc.)
   * @returns HTML string with highlighted syntax classes
   */
  highlightCode(code: string, language?: string): string;

  /**
   * Highlights raw editor text line by line using AST parser.
   * Returns array of HTML strings corresponding line-by-line to the input document.
   *
   * @param content Full Markdown content of the editor
   * @returns Array of HTML strings for each line with syntax highlight classes
   */
  highlightEditorLines(content: string): string[];
}

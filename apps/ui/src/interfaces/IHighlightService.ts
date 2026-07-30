/**
 * Contract for Lezer-based code syntax highlighting service.
 */
export interface IHighlightService {
  /**
   * Highlights a code block snippet for a given language tag using Lezer AST parsers.
   * Returns HTML string with highlighted syntax tags/classes.
   *
   * @param code Code snippet content
   * @param language Language identifier (js, ts, javascript, python, json, html, css, etc.)
   * @returns HTML string with Lezer highlighted syntax classes
   */
  highlightCode(code: string, language?: string): string;

  /**
   * Processes Markdown text and highlights all ```lang ... ``` fenced code blocks using Lezer.
   *
   * @param markdown Markdown document string
   * @returns Processed Markdown HTML / HTML code blocks with Lezer syntax highlighting
   */
  highlightMarkdownCodeBlocks(markdown: string): string;

  /**
   * Highlights raw Markdown editor text line by line using @lezer/markdown AST parser.
   * Returns array of HTML strings corresponding line-by-line to the input document.
   *
   * @param content Full Markdown content of the editor
   * @returns Array of HTML strings for each line with Lezer syntax highlight classes
   */
  highlightEditorLines(content: string): string[];
}

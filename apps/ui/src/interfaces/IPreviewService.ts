/**
 * Contract for document preview & transpilation service.
 */
export interface IPreviewService {
  /**
   * Transpiles Markdown document into rich HTML preview with LaTeX math, Mermaid diagrams,
   * tables, and code syntax highlighting.
   *
   * @param markdown Markdown document string
   * @returns Processed HTML string ready for preview rendering
   */
  renderPreview(markdown: string): string;
}

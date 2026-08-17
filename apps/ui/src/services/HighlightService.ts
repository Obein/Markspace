import { highlightTree, classHighlighter } from '@lezer/highlight';
import { parser as markdownParser } from '@lezer/markdown';
import { parser as jsParser } from '@lezer/javascript';
import { parser as jsonParser } from '@lezer/json';
import { parser as pythonParser } from '@lezer/python';
import { parser as htmlParser } from '@lezer/html';
import { parser as cssParser } from '@lezer/css';
import { Parser } from '@lezer/common';
import { IHighlightService } from '../interfaces/IHighlightService';

export class HighlightService implements IHighlightService {
  private parsers: Record<string, Parser> = {
    markdown: markdownParser,
    md: markdownParser,
    js: jsParser,
    jsx: jsParser.configure({ dialect: 'jsx' }),
    ts: jsParser.configure({ dialect: 'ts' }),
    tsx: jsParser.configure({ dialect: 'jsx ts' }),
    javascript: jsParser,
    typescript: jsParser.configure({ dialect: 'ts' }),
    json: jsonParser,
    python: pythonParser,
    py: pythonParser,
    html: htmlParser,
    xml: htmlParser,
    css: cssParser,
  };

  public highlightCode(code: string, language: string = 'javascript'): string {
    const langKey = (language || 'javascript').toLowerCase().trim();
    const parser = this.parsers[langKey] || this.parsers['js'];

    try {
      const tree = parser.parse(code);
      let html = '';
      let pos = 0;

      highlightTree(tree, classHighlighter, (from, to, classes) => {
        if (from > pos) {
          html += escapeHtml(code.slice(pos, from));
        }
        const tokenText = escapeHtml(code.slice(from, to));
        html += `<span class="${classes}">${tokenText}</span>`;
        pos = to;
      });

      if (pos < code.length) {
        html += escapeHtml(code.slice(pos));
      }

      return html;
    } catch (err) {
      console.warn('Syntax highlight failed, falling back to escaped text', err);
      return escapeHtml(code);
    }
  }

  public highlightEditorLines(content: string): string[] {
    const lines = content.split('\n');
    if (!content) return ['\u200B'];

    try {
      const tree = markdownParser.parse(content);
      let fullHtml = '';
      let pos = 0;

      highlightTree(tree, classHighlighter, (from, to, classes) => {
        if (from > pos) {
          fullHtml += escapeHtml(content.slice(pos, from));
        }
        const tokenText = escapeHtml(content.slice(from, to));
        fullHtml += `<span class="${classes}">${tokenText}</span>`;
        pos = to;
      });

      if (pos < content.length) {
        fullHtml += escapeHtml(content.slice(pos));
      }

      const highlightedLines = fullHtml.split('\n');
      return highlightedLines.map((line) => line || '\u200B');
    } catch (err) {
      console.warn('Editor line highlight failed, falling back to raw lines', err);
      return lines.map((l) => escapeHtml(l) || '\u200B');
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

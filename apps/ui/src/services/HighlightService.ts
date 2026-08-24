import { highlightTree, classHighlighter } from '@lezer/highlight';
import { parser as baseMarkdownParser, parseCode, GFM } from '@lezer/markdown';
import { parser as jsParser } from '@lezer/javascript';
import { parser as jsonParser } from '@lezer/json';
import { parser as pythonParser } from '@lezer/python';
import { parser as htmlParser } from '@lezer/html';
import { parser as cssParser } from '@lezer/css';
import { parser as rustParser } from '@lezer/rust';
import { parser as goParser } from '@lezer/go';
import { parser as cppParser } from '@lezer/cpp';
import { parser as javaParser } from '@lezer/java';
import { parser as phpParser } from '@lezer/php';
import { Parser } from '@lezer/common';
import { IHighlightService } from '../interfaces/IHighlightService';
import { isMarkdownTableSeparator } from '../utils/TableConverter';
import { customLanguageParsers, tryCustomHighlight } from './languages/languageRegistry';

export class HighlightService implements IHighlightService {
  private parsers: Record<string, Parser>;
  private markdownParser: Parser;

  constructor() {
    const js = jsParser;
    const ts = jsParser.configure({ dialect: 'ts' });
    const jsx = jsParser.configure({ dialect: 'jsx' });
    const tsx = jsParser.configure({ dialect: 'jsx ts' });
    const json = jsonParser;
    const python = pythonParser;
    const html = htmlParser;
    const css = cssParser;
    const rust = rustParser;
    const go = goParser;
    const cpp = cppParser;
    const java = javaParser;
    const php = phpParser;

    this.parsers = {
      js,
      javascript: js,
      ts,
      typescript: ts,
      jsx,
      tsx,
      json,
      python,
      py: python,
      html,
      xml: html,
      css,
      rust,
      rs: rust,
      go,
      golang: go,
      cpp,
      c: cpp,
      'c++': cpp,
      cc: cpp,
      cxx: cpp,
      h: cpp,
      hpp: cpp,
      hh: cpp,
      hxx: cpp,
      java,
      jsp: java,
      php,
      phtml: php,
      ...customLanguageParsers,
    };

    // Configure Markdown parser with GFM and nested fenced code block language parsers
    this.markdownParser = baseMarkdownParser.configure([
      GFM,
      parseCode({
        codeParser: (info: string) => {
          const lang = info.trim().toLowerCase().split(/\s+/)[0];
          return this.parsers[lang] || null;
        },
        htmlParser,
      }),
    ]);

    this.parsers.markdown = this.markdownParser;
    this.parsers.md = this.markdownParser;
  }

  public highlightCode(code: string, language: string = 'javascript'): string {
    const langKey = (language || 'javascript').toLowerCase().trim();

    // 1. Direct fast-path for custom tokenized languages
    const customResult = tryCustomHighlight(code, langKey);
    if (customResult !== null) {
      return customResult;
    }

    // 2. Lezer official AST parsers (js, ts, rust, go, cpp, java, php, python, json, html, css, markdown)
    const parser =
      this.parsers[langKey] ||
      (langKey === 'markdown' || langKey === 'md' ? this.markdownParser : this.parsers['js']);

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

      if (langKey === 'markdown' || langKey === 'md') {
        html = enhanceTableSeparatorStyling(html);
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
      const tree = this.markdownParser.parse(content);
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
      return highlightedLines.map((line) => {
        const enhanced = enhanceTableSeparatorStyling(line);
        return enhanced || '\u200B';
      });
    } catch (err) {
      console.warn('Editor line highlight failed, falling back to raw lines', err);
      return lines.map((l) => escapeHtml(l) || '\u200B');
    }
  }
}

/**
 * Ensures table separator rows (|---|---|) in the editor share the exact same styling as table headers.
 */
function enhanceTableSeparatorStyling(html: string): string {
  const lines = html.split('\n');
  const processed = lines.map((line) => {
    const textOnly = line.replace(/<[^>]*>/g, '').trim();
    if (textOnly.length > 0 && textOnly.includes('-') && isMarkdownTableSeparator(textOnly)) {
      return `<span class="tok-tableDelimiter tok-heading tok-strong">${line}</span>`;
    }
    return line;
  });
  return processed.join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

import { highlightTree, classHighlighter } from '@lezer/highlight';
import { parser as markdownParser } from '@lezer/markdown';
import { parser as jsParser } from '@lezer/javascript';
import { parser as jsonParser } from '@lezer/json';
import { parser as pythonParser } from '@lezer/python';
import { parser as htmlParser } from '@lezer/html';
import { parser as cssParser } from '@lezer/css';
import { Parser } from '@lezer/common';
import { marked, Renderer, Tokens } from 'marked';
import { IHighlightService } from '../interfaces/IHighlightService';

export class LezerHighlightService implements IHighlightService {
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

  private customRenderer: Renderer;

  constructor() {
    this.customRenderer = new Renderer();

    // Code blocks with Lezer engine
    this.customRenderer.code = (token: Tokens.Code) => {
      const language = token.lang ? token.lang.trim() : 'text';
      const highlighted = this.highlightCode(token.text || '', language);
      return `<div class="lezer-code-block font-editor-mono font-mono text-xs my-4 rounded-xl border border-white/10 bg-zinc-950/80 overflow-hidden shadow-lg"><div class="px-4 py-1.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-[11px] text-zinc-400 font-mono"><span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase font-semibold text-[10px]">${escapeHtml(language)}</span><span class="text-[10px] text-zinc-500 font-mono">Lezer Engine</span></div><pre class="p-4 overflow-x-auto text-zinc-100 leading-relaxed font-editor-mono font-mono"><code>${highlighted}</code></pre></div>`;
    };

    // Table with container
    this.customRenderer.table = (token: Tokens.Table) => {
      let thead = '<thead class="bg-white/10 text-blue-300 border-b border-white/10"><tr>';
      token.header.forEach((cell) => {
        const cellText = this.customRenderer.parser.parseInline(cell.tokens || []);
        thead += `<th class="px-4 py-2.5 text-left font-semibold">${cellText}</th>`;
      });
      thead += '</tr></thead>';

      let tbody = '<tbody>';
      token.rows.forEach((row) => {
        tbody += '<tr class="border-b border-white/5 hover:bg-white/5 transition">';
        row.forEach((cell) => {
          const cellText = this.customRenderer.parser.parseInline(cell.tokens || []);
          tbody += `<td class="px-4 py-2 text-zinc-200">${cellText}</td>`;
        });
        tbody += '</tr>';
      });
      tbody += '</tbody>';

      return `<div class="overflow-x-auto my-4"><table class="w-full text-xs font-preview-body font-sans border-collapse border border-white/10 rounded-xl overflow-hidden shadow-lg">${thead}${tbody}</table></div>`;
    };
  }

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
      console.warn('Lezer syntax highlight failed, falling back to escaped text', err);
      return escapeHtml(code);
    }
  }

  public highlightMarkdownCodeBlocks(markdown: string): string {
    if (!markdown) return '';
    try {
      return marked(markdown, {
        renderer: this.customRenderer,
        gfm: true,
        breaks: true,
        async: false,
      }) as string;
    } catch (err) {
      console.error('Marked parsing error', err);
      return escapeHtml(markdown);
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
      console.warn('Lezer Markdown editor line highlight failed, falling back to raw lines', err);
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

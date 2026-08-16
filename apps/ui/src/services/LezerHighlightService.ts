import { highlightTree, classHighlighter } from '@lezer/highlight';
import { parser as markdownParser } from '@lezer/markdown';
import { parser as jsParser } from '@lezer/javascript';
import { parser as jsonParser } from '@lezer/json';
import { parser as pythonParser } from '@lezer/python';
import { parser as htmlParser } from '@lezer/html';
import { parser as cssParser } from '@lezer/css';
import { Parser } from '@lezer/common';
import { Marked, Renderer, Tokens } from 'marked';
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

  private markedInstance: Marked;

  constructor() {
    this.markedInstance = new Marked({
      gfm: true,
      breaks: true,
    });

    const renderer: Partial<Renderer> = {
      heading: (token: Tokens.Heading) => {
        const text = this.markedInstance.parseInline(token.text || '');
        if (token.depth === 1) {
          return `<h1 class="font-preview-heading font-serif text-3xl font-extrabold text-white mt-8 mb-4 border-b border-white/20 pb-2 tracking-wide">${text}</h1>`;
        }
        if (token.depth === 2) {
          return `<h2 class="font-preview-heading font-serif text-xl font-bold text-white mt-8 mb-3 border-b border-white/10 pb-1.5 flex items-center gap-2 tracking-wide"><span class="w-2 h-5 bg-blue-500 rounded-full"></span>${text}</h2>`;
        }
        if (token.depth === 3) {
          return `<h3 class="font-preview-heading font-serif text-lg font-semibold text-white mt-6 mb-2 flex items-center gap-2 tracking-wide"><span class="w-1.5 h-4 bg-blue-500 rounded-full"></span>${text}</h3>`;
        }
        return `<h4 class="font-preview-heading font-serif text-base font-semibold text-zinc-200 mt-4 mb-2">${text}</h4>`;
      },
      code: (token: Tokens.Code) => {
        const language = token.lang ? token.lang.trim() : 'text';
        const highlighted = this.highlightCode(token.text || '', language);
        return `<div class="lezer-code-block font-editor-mono font-mono text-xs my-4 rounded-xl border border-white/10 bg-zinc-950/80 overflow-hidden shadow-lg"><div class="px-4 py-1.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-[11px] text-zinc-400 font-mono"><span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase font-semibold text-[10px]">${escapeHtml(language)}</span><span class="text-[10px] text-zinc-500 font-mono">Lezer Engine</span></div><pre class="p-4 overflow-x-auto text-zinc-100 leading-relaxed font-editor-mono font-mono"><code>${highlighted}</code></pre></div>`;
      },
      codespan: (token: Tokens.Codespan) => {
        return `<code class="px-1.5 py-0.5 rounded bg-white/10 text-blue-300 font-editor-mono font-mono text-xs border border-white/10">${escapeHtml(token.text)}</code>`;
      },
      blockquote: (token: Tokens.Blockquote) => {
        const body = this.markedInstance.parse(token.text || '', { async: false });
        return `<blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-3 text-zinc-300 italic bg-white/5 rounded-r-xl font-preview-body font-sans">${body}</blockquote>`;
      },
      strong: (token: Tokens.Strong) => {
        const text = this.markedInstance.parseInline(token.text || '');
        return `<strong class="font-bold text-blue-400 font-preview-body font-sans">${text}</strong>`;
      },
      em: (token: Tokens.Em) => {
        const text = this.markedInstance.parseInline(token.text || '');
        return `<em class="italic text-zinc-300 font-preview-body font-sans">${text}</em>`;
      },
      table: (token: Tokens.Table) => {
        let thead = '<thead class="bg-white/10 text-blue-300 border-b border-white/10"><tr>';
        token.header.forEach((cell) => {
          thead += `<th class="px-4 py-2.5 text-left font-semibold">${this.markedInstance.parseInline(cell.text || '')}</th>`;
        });
        thead += '</tr></thead>';

        let tbody = '<tbody>';
        token.rows.forEach((row) => {
          tbody += '<tr class="border-b border-white/5 hover:bg-white/5 transition">';
          row.forEach((cell) => {
            tbody += `<td class="px-4 py-2 text-zinc-200">${this.markedInstance.parseInline(cell.text || '')}</td>`;
          });
          tbody += '</tr>';
        });
        tbody += '</tbody>';

        return `<div class="overflow-x-auto my-4"><table class="w-full text-xs font-preview-body font-sans border-collapse border border-white/10 rounded-xl overflow-hidden shadow-lg">${thead}${tbody}</table></div>`;
      },
      list: (token: Tokens.List) => {
        let listHtml = token.ordered
          ? '<ol class="list-decimal pl-6 my-2 space-y-1 font-preview-body font-sans text-zinc-200 text-xs leading-relaxed">'
          : '<ul class="my-2 space-y-1 font-preview-body font-sans text-zinc-200 text-xs leading-relaxed">';

        token.items.forEach((item) => {
          const itemContent = this.markedInstance.parseInline(item.text || '');
          listHtml += token.ordered
            ? `<li>${itemContent}</li>`
            : `<li class="flex items-start gap-2"><span class="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></span><div>${itemContent}</div></li>`;
        });

        listHtml += token.ordered ? '</ol>' : '</ul>';
        return listHtml;
      },
      link: (token: Tokens.Link) => {
        const text = this.markedInstance.parseInline(token.text || '');
        return `<a href="${escapeHtml(token.href)}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline font-medium" title="${escapeHtml(token.title || '')}">${text}</a>`;
      },
      hr: () => {
        return '<hr class="my-6 border-white/10" />';
      },
      paragraph: (token: Tokens.Paragraph) => {
        const text = this.markedInstance.parseInline(token.text || '');
        return `<p class="my-3 text-zinc-200 text-xs font-preview-body font-sans leading-relaxed">${text}</p>`;
      },
    };

    this.markedInstance.use({ renderer });
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
      return this.markedInstance.parse(markdown, { async: false }) as string;
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

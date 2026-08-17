import { marked, Renderer, Tokens } from 'marked';
import katex from 'katex';
import { IPreviewService } from '../interfaces/IPreviewService';
import { IHighlightService } from '../interfaces/IHighlightService';

export class MarkdownPreviewService implements IPreviewService {
  private customRenderer: Renderer;
  private highlightService: IHighlightService;

  constructor(highlightService: IHighlightService) {
    this.highlightService = highlightService;
    this.customRenderer = new Renderer();

    // Custom code block renderer: handles Mermaid, LaTeX/Math, and Syntax Highlighting
    this.customRenderer.code = (token: Tokens.Code) => {
      const language = token.lang ? token.lang.trim().toLowerCase() : 'text';

      // 1. Mermaid Diagram Code Block
      if (language === 'mermaid') {
        const id = `mermaid_${Math.random().toString(36).substring(2, 9)}`;
        return `<div class="mermaid-container my-6 flex justify-center overflow-x-auto p-4 rounded-2xl bg-white/5 border border-white/10 shadow-lg"><pre class="mermaid" id="${id}">${escapeHtml(token.text)}</pre></div>`;
      }

      // 2. LaTeX / Math Code Block
      if (language === 'math' || language === 'latex' || language === 'katex') {
        try {
          const rendered = katex.renderToString(token.text.trim(), {
            displayMode: true,
            throwOnError: false,
          });
          return `<div class="katex-display-block my-4 flex justify-center overflow-x-auto p-4 rounded-xl bg-white/5 border border-white/10 shadow-md text-white">${rendered}</div>`;
        } catch {
          return `<pre class="text-red-400 p-2 font-mono text-xs">${escapeHtml(token.text)}</pre>`;
        }
      }

      // 3. Syntax Highlighted Code Block using HighlightService
      const highlighted = this.highlightService.highlightCode(token.text || '', language);
      return `<div class="lezer-code-block font-editor-mono font-mono text-xs my-4 rounded-xl border border-white/10 bg-zinc-950/80 overflow-hidden shadow-lg"><div class="px-4 py-1.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-[11px] text-zinc-400 font-mono"><span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase font-semibold text-[10px]">${escapeHtml(language)}</span><span class="text-[10px] text-zinc-500 font-mono">Syntax Highlight</span></div><pre class="p-4 overflow-x-auto text-zinc-100 leading-relaxed font-editor-mono font-mono"><code>${highlighted}</code></pre></div>`;
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

  public renderPreview(markdown: string): string {
    if (!markdown) return '';
    try {
      const mathBlocks: string[] = [];

      // 1. Preprocess Block Math $$ ... $$
      let processed = markdown.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
        try {
          const html = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
          const block = `<div class="katex-display-block my-4 flex justify-center overflow-x-auto p-4 rounded-xl bg-white/5 border border-white/10 shadow-md text-white">${html}</div>`;
          const placeholder = `___KATEX_BLOCK_${mathBlocks.length}___`;
          mathBlocks.push(block);
          return placeholder;
        } catch {
          return `$$${math}$$`;
        }
      });

      // 2. Preprocess Block Math \[ ... \]
      processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, (_, math) => {
        try {
          const html = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
          const block = `<div class="katex-display-block my-4 flex justify-center overflow-x-auto p-4 rounded-xl bg-white/5 border border-white/10 shadow-md text-white">${html}</div>`;
          const placeholder = `___KATEX_BLOCK_${mathBlocks.length}___`;
          mathBlocks.push(block);
          return placeholder;
        } catch {
          return `\\[${math}\\]`;
        }
      });

      // 3. Preprocess Inline Math $...$ (ignoring escaped \$)
      processed = processed.replace(/(?<!\\|\$)\$(?!\$)([^\$\n]+?)(?<!\\|\$)\$/g, (_, math) => {
        try {
          const html = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
          const placeholder = `___KATEX_INLINE_${mathBlocks.length}___`;
          mathBlocks.push(html);
          return placeholder;
        } catch {
          return `$${math}$`;
        }
      });

      // 4. Preprocess Inline Math \( ... \)
      processed = processed.replace(/\\\(([\s\S]+?)\\\)/g, (_, math) => {
        try {
          const html = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
          const placeholder = `___KATEX_INLINE_${mathBlocks.length}___`;
          mathBlocks.push(html);
          return placeholder;
        } catch {
          return `\\(${math}\\)`;
        }
      });

      // 5. Parse with Marked
      let result = marked(processed, {
        renderer: this.customRenderer,
        gfm: true,
        breaks: true,
        async: false,
      }) as string;

      // 6. Restore KaTeX blocks & inlines
      mathBlocks.forEach((rendered, idx) => {
        result = result.replace(`<p>___KATEX_BLOCK_${idx}___</p>`, rendered);
        result = result.replace(`___KATEX_BLOCK_${idx}___`, rendered);
        result = result.replace(`___KATEX_INLINE_${idx}___`, rendered);
      });

      return result;
    } catch (err) {
      console.error('Marked preview rendering error', err);
      return escapeHtml(markdown);
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

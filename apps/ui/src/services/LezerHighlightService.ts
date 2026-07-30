import { highlightTree, classHighlighter } from '@lezer/highlight';
import { parser as jsParser } from '@lezer/javascript';
import { parser as jsonParser } from '@lezer/json';
import { parser as pythonParser } from '@lezer/python';
import { parser as htmlParser } from '@lezer/html';
import { parser as cssParser } from '@lezer/css';
import { Parser } from '@lezer/common';
import { IHighlightService } from '../interfaces/IHighlightService';

export class LezerHighlightService implements IHighlightService {
  private parsers: Record<string, Parser> = {
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
      console.warn('Lezer syntax highlight failed, falling back to escaped text', err);
      return escapeHtml(code);
    }
  }

  public highlightMarkdownCodeBlocks(markdown: string): string {
    const fencedCodeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const codeBlocks: string[] = [];

    // Extract code blocks, run Lezer syntax highlighting, and store HTML blocks
    const placeholdersMarkdown = markdown.replace(fencedCodeBlockRegex, (_, lang, code) => {
      const language = lang ? lang.trim() : 'code';
      const highlightedHtml = this.highlightCode(code.trimEnd(), language);
      const htmlBlock = `<div class="lezer-code-block font-mono text-xs my-4 rounded-xl border border-white/10 bg-zinc-950/80 overflow-hidden shadow-lg"><div class="px-4 py-1.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-[11px] text-zinc-400 font-mono"><span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase font-semibold text-[10px]">${language}</span><span class="text-[10px] text-zinc-500 font-mono">Lezer Engine</span></div><pre class="p-4 overflow-x-auto text-zinc-100 leading-relaxed font-mono"><code>${highlightedHtml}</code></pre></div>`;

      const placeholder = `___LEZER_CODE_BLOCK_${codeBlocks.length}___`;
      codeBlocks.push(htmlBlock);
      return placeholder;
    });

    // Escape and format surrounding Markdown text
    let html = placeholdersMarkdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-6 mb-3 border-b border-white/10 pb-1">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-extrabold text-white mt-8 mb-4 border-b border-white/20 pb-2">$1</h1>');

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-blue-400">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-zinc-400">$1</em>');

    // Restore Lezer highlighted code blocks
    codeBlocks.forEach((block, idx) => {
      html = html.replace(`___LEZER_CODE_BLOCK_${idx}___`, block);
    });

    return html;
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

import { highlightTree, classHighlighter } from '@lezer/highlight';
import { parser as markdownParser } from '@lezer/markdown';
import { parser as jsParser } from '@lezer/javascript';
import { parser as jsonParser } from '@lezer/json';
import { parser as pythonParser } from '@lezer/python';
import { parser as htmlParser } from '@lezer/html';
import { parser as cssParser } from '@lezer/css';
import { Parser } from '@lezer/common';
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

    // 1. Extract code blocks, run Lezer syntax highlighting, and store HTML blocks
    const placeholdersMarkdown = markdown.replace(fencedCodeBlockRegex, (_, lang, code) => {
      const language = lang ? lang.trim() : 'code';
      const highlightedHtml = this.highlightCode(code.trimEnd(), language);
      const htmlBlock = `<div class="lezer-code-block font-mono text-xs my-4 rounded-xl border border-white/10 bg-zinc-950/80 overflow-hidden shadow-lg"><div class="px-4 py-1.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-[11px] text-zinc-400 font-mono"><span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase font-semibold text-[10px]">${language}</span><span class="text-[10px] text-zinc-500 font-mono">Lezer Engine</span></div><pre class="p-4 overflow-x-auto text-zinc-100 leading-relaxed font-mono"><code>${highlightedHtml}</code></pre></div>`;

      const placeholder = `___LEZER_CODE_BLOCK_${codeBlocks.length}___`;
      codeBlocks.push(htmlBlock);
      return placeholder;
    });

    // 2. Parse Markdown elements
    let html = placeholdersMarkdown;

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white mt-5 mb-2 flex items-center gap-2"><span class="w-1.5 h-4 bg-blue-500 rounded-full"></span>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-7 mb-3 border-b border-white/10 pb-1.5 flex items-center gap-2"><span class="w-2 h-5 bg-blue-500 rounded-full"></span>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-extrabold text-white mt-8 mb-4 border-b border-white/20 pb-2 font-mono">$1</h1>');

    // Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-blue-400">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-zinc-300">$1</em>');

    // Inline Code
    html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/10 text-blue-300 font-mono text-xs border border-white/10">$1</code>');

    // Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-3 text-zinc-300 italic bg-white/5 rounded-r-xl">$1</blockquote>');

    // Bullet Lists
    html = html.replace(/^- (.*$)/gim, '<div class="flex items-start gap-2 my-1 text-zinc-200"><span class="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></span><span>$1</span></div>');

    // Tables
    const tableRegex = /((?:\|[^\n]+\|\n?)+)/g;
    html = html.replace(tableRegex, (tableBlock) => {
      const rows = tableBlock.trim().split('\n').filter(Boolean);
      if (rows.length < 2) return tableBlock;

      let tableHtml = '<div class="overflow-x-auto my-4"><table class="w-full text-xs font-mono border-collapse border border-white/10 rounded-xl overflow-hidden shadow-lg">';
      
      rows.forEach((row, idx) => {
        const cells = row.split('|').slice(1, -1).map((c) => c.trim());
        if (idx === 0) {
          // Header row
          tableHtml += '<thead class="bg-white/10 text-blue-300 border-b border-white/10"><tr>';
          cells.forEach((cell) => {
            tableHtml += `<th class="px-4 py-2.5 text-left font-semibold">${cell}</th>`;
          });
          tableHtml += '</tr></thead><tbody>';
        } else if (idx === 1 && cells.every((c) => c.startsWith('---') || c.startsWith('-'))) {
          // Separator row (ignore)
          return;
        } else {
          // Data row
          tableHtml += `<tr class="border-b border-white/5 hover:bg-white/5 transition">`;
          cells.forEach((cell) => {
            tableHtml += `<td class="px-4 py-2 text-zinc-200">${cell}</td>`;
          });
          tableHtml += '</tr>';
        }
      });

      tableHtml += '</tbody></table></div>';
      return tableHtml;
    });

    // Paragraph breaks
    html = html.replace(/\n\n/g, '<div class="h-3"></div>');

    // Restore Lezer highlighted code blocks
    codeBlocks.forEach((block, idx) => {
      html = html.replace(`___LEZER_CODE_BLOCK_${idx}___`, block);
    });

    return html;
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

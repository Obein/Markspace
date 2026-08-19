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
      const text = token.text || '';
      const rawLanguage = token.lang ? token.lang.trim() : '';
      const language = rawLanguage.toLowerCase();

      // 1. Mermaid Diagram Code Block (explicit ```mermaid or implicit starting with diagram keyword)
      if (isMermaidCode(text, language)) {
        const normalized = normalizeMermaidCode(text);
        return renderMermaidContainer(normalized);
      }

      // 2. LaTeX / Math Code Block
      if (isMathCode(text, language)) {
        let mathContent = text.trim();
        if (mathContent.startsWith('$$') && mathContent.endsWith('$$')) {
          mathContent = mathContent.slice(2, -2).trim();
        }
        return renderKatexDisplay(mathContent);
      }

      // 3. Syntax Highlighted Code Block using HighlightService
      const lang = language || 'text';
      const highlighted = this.highlightService.highlightCode(text, lang);

      const langHeader = rawLanguage
        ? `<div class="code-block-header"><span class="code-lang-tag">${escapeHtml(rawLanguage)}</span></div>`
        : '';

      return `<div class="code-block-wrapper">${langHeader}<pre><code class="font-editor-mono font-mono text-xs leading-relaxed text-zinc-900 dark:text-zinc-100">${highlighted}</code></pre></div>`;
    };

    // Table with container
    this.customRenderer.table = (token: Tokens.Table) => {
      let thead = '<thead class="bg-black/5 dark:bg-white/10 text-zinc-900 dark:text-primaryColor-300 border-b border-black/10 dark:border-white/10"><tr>';
      token.header.forEach((cell) => {
        const cellText = this.customRenderer.parser.parseInline(cell.tokens || []);
        thead += `<th class="px-4 py-2.5 text-left font-semibold">${cellText}</th>`;
      });
      thead += '</tr></thead>';

      let tbody = '<tbody>';
      token.rows.forEach((row) => {
        tbody += '<tr class="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition">';
        row.forEach((cell) => {
          const cellText = this.customRenderer.parser.parseInline(cell.tokens || []);
          tbody += `<td class="px-4 py-2 text-zinc-800 dark:text-zinc-200">${cellText}</td>`;
        });
        tbody += '</tr>';
      });
      tbody += '</tbody>';

      return `<div class="overflow-x-auto my-4"><table class="w-full text-xs font-preview-body font-sans border-collapse border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-sm dark:shadow-md bg-white/60 dark:bg-black/20">${thead}${tbody}</table></div>`;
    };
  }

  public renderPreview(markdown: string): string {
    if (!markdown) return '';
    try {
      const placeholders = new Map<string, string>();
      let placeholderIdx = 0;

      const createPlaceholder = (html: string): string => {
        const key = `@@KATEX_PH_${placeholderIdx++}_${Math.random().toString(36).substring(2, 7)}@@`;
        placeholders.set(key, html);
        return key;
      };

      // 0. Extract fenced code blocks first so raw Mermaid / LaTeX regex doesn't match inside other code blocks
      const codeBlockPlaceholders = new Map<string, string>();
      let codeIdx = 0;
      let processed = markdown.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, (fenced) => {
        const key = `@@FENCED_CODE_${codeIdx++}@@`;
        codeBlockPlaceholders.set(key, fenced);
        return key;
      });

      // 1. Extract raw Mermaid diagram blocks line-by-line (strictly terminating before markdown dividers or headings)
      processed = extractRawMermaidBlocks(processed, createPlaceholder);

      // 2. Block LaTeX Math $$ ... $$
      processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
        return createPlaceholder(renderKatexDisplay(math));
      });

      // 3. Block LaTeX Math \[ ... \]
      processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, (_, math) => {
        return createPlaceholder(renderKatexDisplay(math));
      });

      // 4. LaTeX standard environments \begin{equation/align/matrix/pmatrix/cases}...
      processed = processed.replace(
        /(\\begin\{(?:equation|align|gather|matrix|pmatrix|bmatrix|vmatrix|cases)\*?\}[\s\S]+?\\end\{(?:equation|align|gather|matrix|pmatrix|bmatrix|vmatrix|cases)\*?\})/g,
        (_, math) => {
          return createPlaceholder(renderKatexDisplay(math));
        }
      );

      // 5. Inline LaTeX Math \( ... \)
      processed = processed.replace(/\\\(([\s\S]+?)\\\)/g, (_, math) => {
        return createPlaceholder(renderKatexInline(math));
      });

      // 6. Inline LaTeX Math $...$ (avoid matching escaped \$ or standard currency values like $100)
      processed = processed.replace(/(^|[^\\])\$([^\$\n\r]+?)\$/g, (match, prefix, math) => {
        // If it's purely digits (like $50 or $100.00), treat as currency
        if (/^\s*\d+(?:\.\d+)?\s*$/.test(math)) {
          return match;
        }
        const html = renderKatexInline(math);
        return `${prefix}${createPlaceholder(html)}`;
      });

      // 7. Restore fenced code blocks before passing to Marked
      codeBlockPlaceholders.forEach((fenced, key) => {
        processed = processed.replace(key, fenced);
      });

      // 8. Parse with Marked
      let result = marked(processed, {
        renderer: this.customRenderer,
        gfm: true,
        breaks: true,
        async: false,
      }) as string;

      // 9. Restore all KaTeX and raw Mermaid placeholders
      placeholders.forEach((html, key) => {
        result = result.split(`<p>${key}</p>`).join(html);
        result = result.split(key).join(html);
      });

      return result;
    } catch (err) {
      console.error('Marked preview rendering error', err);
      return escapeHtml(markdown);
    }
  }
}

function extractRawMermaidBlocks(markdown: string, createPlaceholder: (html: string) => string): string {
  const lines = markdown.split('\n');
  const resultLines: string[] = [];
  let inDiagram = false;
  let currentDiagramLines: string[] = [];

  const isDiagramStart = (line: string): boolean => {
    const trimmed = line.trim();
    return /^(graph\s+[A-Za-z0-9]+|flowchart\s+[A-Za-z0-9]+|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|quadrantChart|xychart|timeline|architecture|kanban|block-beta)\b/.test(
      trimmed
    );
  };

  const isDiagramTerminator = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    // Markdown headings (# Title), Horizontal rules (---, ***, ___, --------------------), blockquotes, tables
    if (/^#{1,6}\s/.test(trimmed)) return true;
    if (/^[-*_]{3,}$/.test(trimmed)) return true;
    if (/^>\s/.test(trimmed)) return true;
    if (/^\|.*\|$/.test(trimmed)) return true;
    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!inDiagram) {
      if (isDiagramStart(line)) {
        inDiagram = true;
        currentDiagramLines = [line];
      } else {
        resultLines.push(line);
      }
    } else {
      if (isDiagramTerminator(line)) {
        // Diagram ended by heading, hr, etc.
        const diagramCode = currentDiagramLines.join('\n');
        const normalized = normalizeMermaidCode(diagramCode);
        const container = renderMermaidContainer(normalized);
        resultLines.push(createPlaceholder(container));
        resultLines.push(line);
        inDiagram = false;
        currentDiagramLines = [];
      } else if (
        trimmed === '' &&
        i + 1 < lines.length &&
        isDiagramTerminator(lines[i + 1])
      ) {
        // Diagram followed by empty line then terminator
        const diagramCode = currentDiagramLines.join('\n');
        const normalized = normalizeMermaidCode(diagramCode);
        const container = renderMermaidContainer(normalized);
        resultLines.push(createPlaceholder(container));
        inDiagram = false;
        currentDiagramLines = [];
      } else {
        currentDiagramLines.push(line);
      }
    }
  }

  if (inDiagram && currentDiagramLines.length > 0) {
    const diagramCode = currentDiagramLines.join('\n');
    const normalized = normalizeMermaidCode(diagramCode);
    const container = renderMermaidContainer(normalized);
    resultLines.push(createPlaceholder(container));
  }

  return resultLines.join('\n');
}

function isMermaidCode(text: string, lang?: string): boolean {
  if (lang && lang.toLowerCase() === 'mermaid') return true;
  const trimmed = text.trim();
  return /^(graph\b|flowchart\b|sequenceDiagram\b|classDiagram\b|stateDiagram\b|erDiagram\b|gantt\b|pie\b|journey\b|gitGraph\b|mindmap\b|quadrantChart\b|xychart\b|timeline\b|architecture\b|kanban\b|block-beta\b|C4Context\b|C4Container\b|C4Component\b|C4Dynamic\b|C4Deployment\b)/i.test(
    trimmed
  );
}

function isMathCode(text: string, lang?: string): boolean {
  if (lang && ['math', 'latex', 'katex', 'tex'].includes(lang.toLowerCase())) return true;
  const trimmed = text.trim();
  return (
    (trimmed.startsWith('$$') && trimmed.endsWith('$$')) ||
    trimmed.startsWith('\\begin{') ||
    trimmed.startsWith('\\[')
  );
}

export function normalizeMermaidCode(code: string): string {
  let normalized = code.trim();

  // 1. Strip any trailing markdown horizontal rules / dashes (e.g. ---, ***, --------------------)
  normalized = normalized.replace(/\n\s*[-*_]{3,}\s*$/g, '').trim();

  // 2. Normalize case-sensitive keywords for sequenceDiagram & flowchart
  normalized = normalized
    // Sequence diagram standard keywords casing
    .replace(/^(\s*)Actor\s+/gm, '$1actor ')
    .replace(/^(\s*)Participant\s+/gm, '$1participant ')
    .replace(/^(\s*)Autonumber\s*/gm, '$1autonumber\n')
    .replace(/^(\s*)Activate\s+/gm, '$1activate ')
    .replace(/^(\s*)Deactivate\s+/gm, '$1deactivate ')
    .replace(/^(\s*)Alt\s+/gm, '$1alt ')
    .replace(/^(\s*)Else\s+/gm, '$1else ')
    .replace(/^(\s*)End\s*$/gm, '$1end')
    .replace(/^(\s*)Loop\s+/gm, '$1loop ')
    .replace(/^(\s*)Opt\s+/gm, '$1opt ')
    .replace(/^(\s*)Par\s+/gm, '$1par ')
    .replace(/^(\s*)Critical\s+/gm, '$1critical ')
    .replace(/^(\s*)Break\s+/gm, '$1break ')
    .replace(/^(\s*)Rect\s+/gm, '$1rect ')
    .replace(/^(\s*)Note\s+/gm, '$1note ')
    // Chinese sequence diagram keywords mapping
    .replace(/^(\s*)激活\s+/gm, '$1activate ')
    .replace(/^(\s*)销毁\s+/gm, '$1deactivate ')
    .replace(/^(\s*)停用\s+/gm, '$1deactivate ')
    .replace(/^(\s*)参与者\s+/gm, '$1participant ')
    .replace(/^(\s*)角色\s+/gm, '$1actor ')
    .replace(/^(\s*)分支\s+/gm, '$1alt ')
    .replace(/^(\s*)否则\s+/gm, '$1else ')
    .replace(/^(\s*)结束\s*$/gm, '$1end')
    .replace(/^(\s*)循环\s+/gm, '$1loop ')
    .replace(/^(\s*)可选\s+/gm, '$1opt ');

  return normalized.trim();
}

function renderMermaidContainer(code: string): string {
  const encoded = encodeURIComponent(code.trim());
  return `<div class="mermaid-container my-6 flex justify-center overflow-x-auto p-4 rounded-2xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-sm dark:shadow-lg"><div class="mermaid-diagram-code text-xs text-zinc-600 dark:text-zinc-400 font-mono flex items-center gap-2" data-mermaid-code="${encoded}"><span class="w-2 h-2 rounded-full bg-primaryColor-500 animate-ping"></span><span>Loading Mermaid Diagram...</span></div></div>`;
}

function renderKatexDisplay(math: string): string {
  try {
    const html = katex.renderToString(math.trim(), {
      displayMode: true,
      throwOnError: false,
      output: 'htmlAndMathml',
    });
    return `<div class="katex-display-block my-4 flex justify-center overflow-x-auto p-4 rounded-xl bg-black/[0.03] dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-sm dark:shadow-md text-zinc-900 dark:text-white">${html}</div>`;
  } catch {
    return `<div class="katex-display-block text-red-600 dark:text-red-400 p-2 text-xs font-mono">${escapeHtml(math)}</div>`;
  }
}

function renderKatexInline(math: string): string {
  try {
    return katex.renderToString(math.trim(), {
      displayMode: false,
      throwOnError: false,
      output: 'htmlAndMathml',
    });
  } catch {
    return `$${math}$`;
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

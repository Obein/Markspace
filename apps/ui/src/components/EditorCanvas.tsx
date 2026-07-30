import React from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface EditorCanvasProps {
  title: string;
  onTitleChange: (title: string) => void;
  content: string;
  onContentChange: (content: string) => void;
  isPreview: boolean;
  onDeleteNote: () => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  title,
  onTitleChange,
  content,
  onContentChange,
  isPreview,
  onDeleteNote,
}) => {
  const { sheetEngine } = useApp();

  // Evaluate Google Sheets formula in Markdown table cells for Live Preview
  const evaluatedMarkdown = sheetEngine.evaluateMarkdownFormulas(content);

  return (
    <main className="flex-1 h-[calc(100vh-2rem)] my-4 mr-4 glass-panel rounded-glass-lg border border-white/10 flex flex-col overflow-hidden shadow-2xl relative">
      {/* Top Action Toolbar */}
      <div className="px-8 py-4 border-b border-white/10 flex items-center justify-between">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled Note"
          className="text-2xl font-bold bg-transparent text-white placeholder-zinc-600 focus:outline-none w-full max-w-xl"
        />

        <button
          onClick={onDeleteNote}
          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition flex items-center gap-1.5 text-xs"
          title="Delete Note"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>

      {/* Editor / Preview Body Canvas */}
      <div className="flex-1 overflow-y-auto p-8 max-w-4xl w-full mx-auto">
        {isPreview ? (
          <div className="prose prose-invert max-w-none space-y-4 text-zinc-200">
            {evaluatedMarkdown ? (
              <div
                className="markdown-preview leading-relaxed space-y-4 whitespace-pre-wrap font-sans"
                dangerouslySetInnerHTML={{
                  __html: formatBasicMarkdown(evaluatedMarkdown),
                }}
              />
            ) : (
              <p className="text-zinc-600 italic text-sm">Nothing to preview...</p>
            )}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Write your Markdown notes here... Try adding a formula table like:

| Item | Amount |
| --- | --- |
| Rent | 1200 |
| Utilities | 150 |
| Total | =SUM(B1:B2) |"
            className="w-full h-full min-h-[500px] bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none resize-none font-mono text-sm leading-relaxed"
          />
        )}
      </div>
    </main>
  );
};

/**
 * Basic Markdown formatting for headings, tables, code blocks, lists, and bold text.
 */
function formatBasicMarkdown(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-6 mb-3 border-b border-white/10 pb-1">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-extrabold text-white mt-8 mb-4 border-b border-white/20 pb-2">$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-blue-400">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-zinc-400">$1</em>');

  // Tables
  const lines = html.split('\n');
  const result: string[] = [];
  let inTable = false;

  for (const line of lines) {
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (!inTable) {
        result.push('<div className="overflow-x-auto my-4"><table className="w-full text-left border-collapse border border-white/10 rounded-xl overflow-hidden">');
        inTable = true;
      }
      const cells = line.split('|').slice(1, -1);
      const isSeparator = cells.every((c) => c.trim().startsWith('---'));
      if (!isSeparator) {
        const cellTags = cells
          .map((c) => `<td class="p-3 border border-white/10 bg-white/5 font-mono text-xs text-zinc-200">${c.trim()}</td>`)
          .join('');
        result.push(`<tr>${cellTags}</tr>`);
      }
    } else {
      if (inTable) {
        result.push('</table></div>');
        inTable = false;
      }
      result.push(line);
    }
  }

  if (inTable) {
    result.push('</table></div>');
  }

  return result.join('\n');
}

import React, { useRef, useState } from 'react';
import {
  FileText,
  AlertCircle,
  Music,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  Quote,
  Code,
  Table as TableIcon,
  Link as LinkIcon,
  Calculator,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VaultFileItem } from '../interfaces/INoteModels';

interface EditorCanvasProps {
  activeFile: VaultFileItem | null;
  title: string;
  onTitleChange: (title: string) => void;
  content: string;
  onContentChange: (content: string) => void;
  isPreview: boolean;
  onDownloadFile: () => void;
  onSelectionStatsChange?: (selectedWords: number, selectedChars: number) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  activeFile,
  title,
  onTitleChange,
  content,
  onContentChange,
  isPreview,
  onDownloadFile,
  onSelectionStatsChange,
}) => {
  const { sheetEngine } = useApp();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Layout width mode: default is Limited-width (false -> max-w-[45em])
  const [isFullWidth, setIsFullWidth] = useState(false);

  const category = activeFile?.category || 'markdown';
  const evaluatedMarkdown = category === 'markdown' && activeFile ? sheetEngine.evaluateMarkdownFormulas(content) : '';

  // Line numbers calculation
  const lines = content.split('\n');

  // Update selected word & character stats
  const handleSelectionChange = () => {
    const textarea = textareaRef.current;
    if (!textarea || !onSelectionStatsChange) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      const selectedText = content.substring(start, end);
      const selCharCount = selectedText.length;
      const selWordCount = selectedText.trim() ? selectedText.trim().split(/\s+/).length : 0;
      onSelectionStatsChange(selWordCount, selCharCount);
    } else {
      onSelectionStatsChange(0, 0);
    }
  };

  // Keyboard shortcut handler for Undo (Ctrl/Cmd+Z) and Redo (Ctrl/Cmd+Shift+Z / Ctrl+Y)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isCmdOrCtrl = e.ctrlKey || e.metaKey;

    if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
      if (e.shiftKey) {
        // Redo
        e.preventDefault();
        document.execCommand('redo');
      } else {
        // Undo
        e.preventDefault();
        document.execCommand('undo');
      }
    } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
      // Redo
      e.preventDefault();
      document.execCommand('redo');
    }
  };

  // Smart double click: Trim trailing whitespace from word selection
  const handleDoubleClick = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    let start = textarea.selectionStart;
    let end = textarea.selectionEnd;

    // If selection ends with whitespace, trim trailing spaces
    while (end > start && /\s/.test(content.charAt(end - 1))) {
      end--;
    }

    textarea.setSelectionRange(start, end);
    handleSelectionChange();
  };

  // Helper to insert formatting syntax into textarea
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    onContentChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 4));
      handleSelectionChange();
    }, 10);
  };

  if (!activeFile) {
    return (
      <main className="flex-1 h-full glass-panel rounded-glass-lg border border-white/10 flex flex-col items-center justify-center p-8 text-center text-zinc-500 shadow-2xl relative z-10">
        <FileText className="w-16 h-16 opacity-10 mb-3" />
        <h3 className="text-lg font-semibold text-zinc-400">No File Selected</h3>
        <p className="text-xs text-zinc-600 mt-1 max-w-sm">
          Select a file from the sidebar tree or click <strong>Add File / Add Dir</strong> to import files into your Vault.
        </p>
      </main>
    );
  }

  // Calculate top padding based on whether formatting toolbar is visible
  const topPaddingClass = category === 'markdown' && !isPreview ? 'pt-28' : 'pt-16';

  return (
    <main className="flex-1 h-full glass-panel rounded-glass-lg border border-white/10 flex flex-col overflow-hidden shadow-2xl relative z-10 transition-all duration-300">
      {/* Floating Translucent Glass Top Header & Toolbar Wrapper */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none flex flex-col">
        {/* Top Header Toolbar */}
        <div className="px-8 py-3.5 backdrop-blur-xl bg-[#09090B]/75 border-b border-white/10 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-xs font-mono text-zinc-500 px-2.5 py-1 rounded bg-white/5 border border-white/10">
              {activeFile.path}
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Untitled Note"
              className="text-xl font-bold bg-transparent text-white placeholder-zinc-600 focus:outline-none flex-1 truncate"
              disabled={category !== 'markdown'}
            />
          </div>

          {/* Layout Width Toggle Button (Limited-width 45em vs Full-width) */}
          <button
            onClick={() => setIsFullWidth(!isFullWidth)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition flex items-center gap-1.5 text-xs font-mono"
            title={isFullWidth ? 'Switch to Limited Width (45em)' : 'Switch to Full Width'}
          >
            {isFullWidth ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
                <span>45em Width</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Full Width</span>
              </>
            )}
          </button>
        </div>

        {/* Markdown Formatting Helper Toolbar */}
        {category === 'markdown' && !isPreview && (
          <div className="px-6 py-2 backdrop-blur-xl bg-[#09090B]/65 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto text-zinc-400 pointer-events-auto">
            <button
              onClick={() => insertFormatting('**', '**')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition"
              title="Bold (**text**)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('*', '*')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition"
              title="Italic (*text*)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-white/10 mx-1" />

            <button
              onClick={() => insertFormatting('# ')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition"
              title="Heading 1 (#)"
            >
              <Heading1 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('## ')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition"
              title="Heading 2 (##)"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('### ')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition"
              title="Heading 3 (###)"
            >
              <Heading3 className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-white/10 mx-1" />

            <button
              onClick={() => insertFormatting('- ')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition"
              title="Bullet List (-)"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('> ')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition"
              title="Quote (>)"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('```\n', '\n```')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition"
              title="Code Block (```)"
            >
              <Code className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-white/10 mx-1" />

            <button
              onClick={() => insertFormatting('\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition flex items-center gap-1 text-[11px]"
              title="Insert Table"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>

            <button
              onClick={() => insertFormatting('[', '](https://)')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition"
              title="Insert Link ([Title](url))"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => insertFormatting('=SUM(A1:A5)')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-blue-400 hover:text-blue-300 transition flex items-center gap-1 text-[11px] font-mono"
              title="Insert Formula (=SUM(A1:A5))"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span>Formula</span>
            </button>
          </div>
        )}
      </div>

      {/* Editor / Preview Canvas Container (Full Panel Height: Allows text to scroll UNDER top & bottom toolbars) */}
      <div className={`absolute inset-0 z-10 flex flex-col w-full mx-auto transition-all duration-300 ${isFullWidth ? 'max-w-full' : 'max-w-[45em]'}`}>
        {/* 1. Markdown / Plaintext Editor with Pure CSS Counters Line Numbers & Synchronized Layered Divs */}
        {category === 'markdown' && !isPreview && (
          <div className="flex-1 overflow-y-auto relative w-full h-full font-mono text-sm leading-relaxed">
            <div className="relative w-full min-h-full">
              {/* Synchronized Line Numbers Gutter + Line Rows (Pure CSS Counters Alignment) */}
              <div
                aria-hidden="true"
                className={`px-6 ${topPaddingClass} pb-8 select-none pointer-events-none font-mono text-sm leading-relaxed`}
              >
                {lines.map((line, idx) => (
                  <div
                    key={idx}
                    data-line={idx + 1}
                    className="relative pl-12 text-transparent whitespace-pre-wrap break-words font-mono text-sm leading-relaxed border-l border-white/10 before:content-[attr(data-line)] before:absolute before:left-2 before:top-0 before:w-8 before:text-right before:text-zinc-600 before:font-mono before:text-sm before:leading-relaxed"
                  >
                    {line || '\u200B'}
                  </div>
                ))}
              </div>

              {/* Textarea Input (Pixel-Perfect Overlaid on Top of Line Rows) */}
              <textarea
                ref={textareaRef}
                value={content}
                onKeyDown={handleKeyDown}
                onDoubleClick={handleDoubleClick}
                onSelect={handleSelectionChange}
                onKeyUp={handleSelectionChange}
                onMouseUp={handleSelectionChange}
                onChange={(e) => {
                  onContentChange(e.target.value);
                  handleSelectionChange();
                }}
                placeholder="Write your Markdown notes here..."
                className={`absolute inset-0 w-full h-full pl-[4.5rem] pr-6 ${topPaddingClass} pb-8 bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none resize-none font-mono text-sm leading-relaxed z-10 overflow-hidden`}
              />
            </div>
          </div>
        )}

        {/* 2. Live Markdown Preview */}
        {category === 'markdown' && isPreview && (
          <div className={`flex-1 overflow-y-auto px-8 ${topPaddingClass} pb-24 w-full mx-auto`}>
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
          </div>
        )}

        {/* 3. Image Preview */}
        {category === 'image' && (
          <div className={`flex-1 overflow-y-auto px-8 ${topPaddingClass} pb-24 flex flex-col items-center justify-center space-y-4`}>
            <div className="p-2 rounded-2xl glass-panel border border-white/10 max-w-2xl overflow-hidden shadow-2xl">
              <img
                src={activeFile.blobUrl || content}
                alt={title}
                className="max-h-[500px] w-auto object-contain rounded-xl"
              />
            </div>
            <p className="text-xs text-zinc-400 font-mono">{activeFile.name} ({(activeFile.size / 1024).toFixed(1)} KB)</p>
          </div>
        )}

        {/* 4. Audio Preview */}
        {category === 'audio' && (
          <div className={`flex-1 overflow-y-auto px-8 ${topPaddingClass} pb-24 flex flex-col items-center justify-center space-y-6`}>
            <div className="p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Music className="w-16 h-16 animate-bounce text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white font-mono">{activeFile.name}</h3>
            <audio controls src={activeFile.blobUrl || content} className="w-full max-w-md rounded-xl" />
          </div>
        )}

        {/* 5. Video Preview */}
        {category === 'video' && (
          <div className={`flex-1 overflow-y-auto px-8 ${topPaddingClass} pb-24 flex flex-col items-center justify-center space-y-4`}>
            <div className="p-2 rounded-2xl glass-panel border border-white/10 max-w-3xl overflow-hidden shadow-2xl">
              <video controls src={activeFile.blobUrl || content} className="max-h-[500px] w-full rounded-xl" />
            </div>
            <p className="text-xs text-zinc-400 font-mono">{activeFile.name}</p>
          </div>
        )}

        {/* 6. Non-viewable Binary File Fallback */}
        {category === 'binary' && (
          <div className={`flex-1 overflow-y-auto px-8 ${topPaddingClass} pb-24 flex flex-col items-center justify-center text-center space-y-6 glass-panel rounded-glass-lg border border-white/10 my-8 max-w-2xl mx-auto`}>
            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 text-blue-400 shadow-inner">
              <AlertCircle className="w-16 h-16 text-blue-400 animate-pulse" />
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-bold text-white">This file format cannot be viewed directly</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                The file <strong className="text-zinc-200 font-mono">{activeFile.filename}</strong> is a non-text or binary format and cannot be rendered inside the Markdown editor.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 w-full max-w-sm text-left text-xs font-mono space-y-1.5 text-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-500">File Path:</span>
                <span className="truncate max-w-[200px] text-blue-400">{activeFile.path}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Size:</span>
                <span>{(activeFile.size / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Type:</span>
                <span>{activeFile.mimeType || 'application/octet-stream'}</span>
              </div>
            </div>

            <button
              onClick={onDownloadFile}
              className="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-2 transition shadow-lg shadow-blue-500/20"
            >
              <FileText className="w-4 h-4" />
              <span>Download {activeFile.filename} to Local Disk</span>
            </button>
          </div>
        )}
      </div>
    </main>
  );
};

/**
 * Basic Markdown formatting helper
 */
function formatBasicMarkdown(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-6 mb-3 border-b border-white/10 pb-1">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-extrabold text-white mt-8 mb-4 border-b border-white/20 pb-2">$1</h1>');

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-blue-400">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-zinc-400">$1</em>');

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

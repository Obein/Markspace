import React, { useEffect, useRef, useState } from 'react';
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
  const { sheetEngine, highlightService } = useApp();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Layout width mode: default is Limited-width (false -> max-w-[45em])
  const [isFullWidth, setIsFullWidth] = useState(false);

  const category = activeFile?.category || 'markdown';

  // Evaluate formula calculations for table cells
  const evaluatedMarkdown =
    category === 'markdown' && activeFile
      ? sheetEngine.evaluateMarkdownFormulas(content)
      : '';

  // Render Markdown preview HTML (Headings in Serif, body in Sans-serif, code in Mono)
  const previewHtml =
    category === 'markdown' && isPreview
      ? highlightService.highlightMarkdownCodeBlocks(evaluatedMarkdown)
      : '';

  // Lines count for edit mode line-number gutter
  const lines = content.split('\n');

  // Auto-expand textarea height based on line count so textarea never shows inner scrollbar
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, lines.length * 24)}px`;
    }
  }, [content, isPreview]);

  // Update selected word & character stats
  const handleSelectionChange = () => {
    const textarea = textareaRef.current;
    if (!textarea || !onSelectionStatsChange) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) {
      onSelectionStatsChange(0, 0);
      return;
    }

    const selectedText = textarea.value.substring(start, end);
    const selWords = selectedText.trim() ? selectedText.trim().split(/\s+/).length : 0;
    const selChars = selectedText.length;

    onSelectionStatsChange(selWords, selChars);
  };

  // Helper to insert formatting tags (bold, italic, headers, tables, etc.)
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;

    const selected = currentText.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;

    const newContent = currentText.substring(0, start) + replacement + currentText.substring(end);
    onContentChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selected.length || 4)
      );
    }, 0);
  };

  if (!activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full glass-panel rounded-glass-lg border border-white/10 text-zinc-500 text-sm font-preview-body font-sans space-y-3 shadow-2xl">
        <FileText className="w-12 h-12 opacity-20 text-zinc-400" />
        <p className="text-zinc-400 font-medium">Select or create a note from the sidebar</p>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col h-full glass-panel rounded-glass-lg border border-white/10 relative overflow-hidden shadow-2xl">
      {/* Top Floating Utility Bar (Fixed Header: Stays on top of content) */}
      <div className="absolute top-0 left-0 right-0 z-20 px-6 py-3 border-b border-white/10 bg-black/40 backdrop-blur-xl flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            disabled={category !== 'markdown'}
            placeholder="Note title..."
            className="flex-1 min-w-0 text-lg font-bold font-editor-mono font-mono text-white bg-transparent focus:outline-none placeholder-zinc-600 disabled:opacity-70"
          />

          <div className="flex items-center gap-2 shrink-0">
            {/* Layout Toggle: Limited Width vs Full Width */}
            <button
              onClick={() => setIsFullWidth(!isFullWidth)}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition border border-white/10"
              title={isFullWidth ? 'Switch to Limited Width' : 'Switch to Full Width'}
            >
              {isFullWidth ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Formatting Toolbar (Only visible in Markdown edit mode) */}
        {category === 'markdown' && !isPreview && (
          <div className="flex items-center gap-1 pt-1 overflow-x-auto border-t border-white/5 scrollbar-none font-editor-mono font-mono">
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
              title="Blockquote (>)"
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
              className="p-1.5 rounded-lg hover:bg-white/10 text-blue-400 hover:text-blue-300 transition flex items-center gap-1 text-[11px] font-editor-mono font-mono"
              title="Insert Formula (=SUM(A1:A5))"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span>Formula</span>
            </button>
          </div>
        )}
      </div>

      {/* Editor / Preview Canvas Container */}
      <div className={`absolute inset-0 z-10 flex flex-col w-full mx-auto transition-all duration-300 ${isFullWidth ? 'max-w-full' : 'max-w-[45em]'}`}>
        {/* Markdown Edit Mode: Pixel-Perfect Textarea with Synced Line Numbers & HW Monospace Fonts */}
        {category === 'markdown' && !isPreview && (
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto relative w-full h-full font-editor-mono font-mono text-sm leading-relaxed"
          >
            {/* Top Toolbar Spacing */}
            <div className="h-20" />

            <div className="flex w-full min-h-[calc(100%-13rem)]">
              {/* Left Line Number Gutter Column */}
              <div className="w-12 py-6 pr-3 text-right select-none text-zinc-600 font-editor-mono font-mono text-xs leading-relaxed shrink-0 border-r border-white/5 space-y-0 opacity-60">
                {lines.map((_, i) => (
                  <div key={i} className="h-[1.5rem] leading-[1.5rem]">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Active Clean Textarea Editor */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                onSelect={handleSelectionChange}
                onKeyUp={handleSelectionChange}
                onClick={handleSelectionChange}
                placeholder="Write your thoughts..."
                className="flex-1 p-6 pl-4 bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none resize-none font-editor-mono font-mono text-sm leading-relaxed relative z-10 whitespace-pre-wrap break-words selection:bg-blue-500/30 selection:text-white overflow-hidden scrollbar-none"
              />
            </div>

            {/* Bottom Status Bar Spacing */}
            <div className="h-24" />
          </div>
        )}

        {/* Markdown Rich Preview Mode: Headings in Serif, Body in Sans-serif, Code in Mono */}
        {category === 'markdown' && isPreview && (
          <div className="flex-1 overflow-y-auto w-full h-full font-preview-body font-sans text-sm leading-relaxed text-zinc-200">
            <div className="h-28" />
            <div className="p-8 pb-28 prose prose-invert max-w-none">
              <div
                dangerouslySetInnerHTML={{
                  __html: previewHtml,
                }}
              />
            </div>
          </div>
        )}

        {category === 'image' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="h-20" />
            <img
              src={content}
              alt={title}
              className="max-h-[60vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
            <p className="text-xs text-zinc-400 font-editor-mono font-mono">{activeFile.filename}</p>
          </div>
        )}

        {category === 'audio' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="h-20" />
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center gap-4 shadow-2xl max-w-md w-full">
              <Music className="w-12 h-12 text-blue-400 animate-pulse" />
              <audio controls src={content} className="w-full" />
              <p className="text-xs text-zinc-400 font-editor-mono font-mono">{activeFile.filename}</p>
            </div>
          </div>
        )}

        {category === 'video' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="h-20" />
            <video
              controls
              src={content}
              className="max-h-[60vh] max-w-full rounded-2xl shadow-2xl border border-white/10"
            />
            <p className="text-xs text-zinc-400 font-editor-mono font-mono">{activeFile.filename}</p>
          </div>
        )}

        {category === 'binary' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="h-20" />
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center gap-4 shadow-2xl max-w-md">
              <AlertCircle className="w-12 h-12 text-blue-400" />
              <div>
                <h3 className="text-base font-bold text-white font-preview-heading font-serif">{activeFile.filename}</h3>
                <p className="text-xs text-zinc-400 mt-1 font-editor-mono font-mono">
                  Binary payload ({activeFile.mimeType})
                </p>
              </div>
              <button
                onClick={onDownloadFile}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium font-preview-body font-sans transition shadow-lg shadow-blue-500/20"
              >
                Download Binary Payload
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

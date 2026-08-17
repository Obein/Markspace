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
  Sigma,
  GitBranch,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import mermaid from 'mermaid';
import { normalizeMermaidCode } from '../services/MarkdownPreviewService';
import { useApp } from '../context/AppContext';
import { VaultFileItem } from '../interfaces/INoteModels';

interface EditorCanvasProps {
  activeFile: VaultFileItem | null;
  title: string;
  onTitleChange: (title: string) => void;
  content: string;
  onContentChange: (content: string) => void;
  isPreview: boolean;
  isSplitView?: boolean;
  hasBottomCapsule?: boolean;
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
  isSplitView = false,
  hasBottomCapsule = true,
  onDownloadFile,
  onSelectionStatsChange,
}) => {
  const { sheetEngine, previewService } = useApp();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const editScrollRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScrollRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Layout width mode: default is Limited-width (false -> max-w-[45em])
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [lineHeights, setLineHeights] = useState<number[]>([]);

  const category = activeFile?.category || 'markdown';

  // Extract base name and extension from title (in top bar only base name is editable)
  const lastDotIndex = title.lastIndexOf('.');
  const baseName = lastDotIndex > 0 ? title.substring(0, lastDotIndex) : title;
  const extension = lastDotIndex > 0 ? title.substring(lastDotIndex) : '';

  // Whether formatting toolbar is displayed in top bar
  const hasFormattingToolbar = category === 'markdown' && (!isPreview || isSplitView);
  // Top Toolbar Spacing: taller when formatting toolbar is present, compact when only title bar is shown
  const topToolbarSpacingClass = hasFormattingToolbar ? 'h-20' : 'h-14';
  // Bottom Status Capsule Spacing: enabled only when bottom floating capsule is active
  const bottomCapsuleSpacingClass = hasBottomCapsule ? 'h-28' : 'h-6';

  // Evaluate formula calculations for table cells
  const evaluatedMarkdown =
    category === 'markdown' && activeFile
      ? sheetEngine.evaluateMarkdownFormulas(content)
      : '';

  // Render Markdown preview HTML via dedicated MarkdownPreviewService
  const previewHtml =
    category === 'markdown' && (isPreview || isSplitView)
      ? previewService.renderPreview(evaluatedMarkdown)
      : '';

  // Lines count for edit mode line-number gutter
  const lines = content.split('\n');

  // Measure rendered pixel height of every line in textarea (including wrapped lines)
  const measureLineHeights = () => {
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!textarea || !mirror) return;

    const computedStyle = window.getComputedStyle(textarea);
    mirror.style.width = `${textarea.clientWidth}px`;
    mirror.style.paddingLeft = computedStyle.paddingLeft;
    mirror.style.paddingRight = computedStyle.paddingRight;
    mirror.style.fontSize = computedStyle.fontSize;
    mirror.style.fontFamily = computedStyle.fontFamily;
    mirror.style.lineHeight = computedStyle.lineHeight;
    mirror.style.letterSpacing = computedStyle.letterSpacing;
    mirror.style.boxSizing = computedStyle.boxSizing;

    const children = mirror.children;
    const heights: number[] = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      heights.push(child.getBoundingClientRect().height || 24);
    }
    setLineHeights(heights);
  };

  useEffect(() => {
    measureLineHeights();
  }, [content, isSplitView, isFullWidth, isPreview]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      measureLineHeights();
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, []);

  // Auto-expand textarea height based on line count so textarea never shows inner scrollbar
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, lines.length * 24)}px`;
    }
  }, [content, isPreview, isSplitView, lineHeights]);

  // Synchronous scrolling handlers for Split View
  const handleEditScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isSplitView || isSyncingScrollRef.current) return;
    const editEl = e.currentTarget;
    const previewEl = previewScrollRef.current;
    if (!editEl || !previewEl) return;

    const editScrollable = editEl.scrollHeight - editEl.clientHeight;
    if (editScrollable <= 0) return;

    const scrollRatio = editEl.scrollTop / editScrollable;
    const previewScrollable = previewEl.scrollHeight - previewEl.clientHeight;

    isSyncingScrollRef.current = true;
    previewEl.scrollTop = scrollRatio * previewScrollable;
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  const handlePreviewScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isSplitView || isSyncingScrollRef.current) return;
    const previewEl = e.currentTarget;
    const editEl = editScrollRef.current;
    if (!editEl || !previewEl) return;

    const previewScrollable = previewEl.scrollHeight - previewEl.clientHeight;
    if (previewScrollable <= 0) return;

    const scrollRatio = previewEl.scrollTop / previewScrollable;
    const editScrollable = editEl.scrollHeight - editEl.clientHeight;

    isSyncingScrollRef.current = true;
    editEl.scrollTop = scrollRatio * editScrollable;
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  // Dynamically render Mermaid diagrams whenever markdown preview updates
  useEffect(() => {
    if (category === 'markdown' && (isPreview || isSplitView) && previewHtml) {
      let isMounted = true;

      const renderAllMermaid = async () => {
        try {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
            fontFamily: 'inherit',
            themeVariables: {
              darkMode: true,
              background: 'transparent',
              primaryColor: '#3b82f6',
              primaryTextColor: '#f4f4f5',
              lineColor: '#60a5fa',
            },
          });

          // Allow DOM to settle
          await new Promise((resolve) => setTimeout(resolve, 30));
          if (!isMounted) return;

          const elements = document.querySelectorAll<HTMLElement>('.mermaid-diagram-code');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            const rawCode = el.getAttribute('data-mermaid-code');
            if (!rawCode) continue;

            try {
              const decodedCode = normalizeMermaidCode(decodeURIComponent(rawCode));
              const uniqueId = `mermaid_svg_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
              const { svg } = await mermaid.render(uniqueId, decodedCode);
              if (!isMounted) return;

              const parent = el.closest('.mermaid-container');
              if (parent) {
                parent.innerHTML = svg;
              }
            } catch (err) {
              console.warn('Mermaid render error for diagram', i, err);
              const parent = el.closest('.mermaid-container');
              if (parent) {
                const decodedCode = decodeURIComponent(rawCode);
                parent.innerHTML = `<div class="p-3 text-xs font-mono text-zinc-300 bg-zinc-950/80 rounded-xl border border-white/10 w-full"><div class="text-amber-400 font-semibold mb-1 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>Mermaid Diagram Code</div><pre class="overflow-x-auto text-zinc-200">${escapeHtml(decodedCode)}</pre></div>`;
              }
            }
          }
        } catch (err) {
          console.warn('Mermaid global initialization warning', err);
        }
      };

      renderAllMermaid();

      return () => {
        isMounted = false;
      };
    }
  }, [previewHtml, isPreview, isSplitView, category]);

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
        start + prefix.length + (selected ? selected.length : 4)
      );
    }, 0);
  };

  if (!activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 font-editor-mono font-mono text-sm select-none">
        <FileText className="w-12 h-12 mb-3 opacity-20 text-blue-400" />
        <p>Select or create a note to begin</p>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col h-full glass-panel rounded-glass-lg border border-white/10 relative overflow-hidden shadow-2xl">
      {/* Hidden line measurement mirror for exact wrapped line-height tracking */}
      <div
        ref={mirrorRef}
        aria-hidden="true"
        className="absolute opacity-0 pointer-events-none font-editor-mono font-mono text-sm leading-6"
        style={{
          visibility: 'hidden',
          position: 'absolute',
          top: -99999,
          left: -99999,
          zIndex: -99,
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className="whitespace-pre-wrap break-words text-sm font-editor-mono font-mono leading-6"
            style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
          >
            {line || '\u00A0'}
          </div>
        ))}
      </div>

      {/* Top Floating Utility Bar (Fixed Header: Stays on top of content) */}
      <div className="absolute top-0 left-0 right-0 z-20 px-6 py-3 glass-bar rounded-t-glass-lg flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          {/* Filename Input Hot Zone: The entire area is clickable to focus and select the filename */}
          <div
            onClick={() => {
              if (category === 'markdown') {
                titleInputRef.current?.focus();
                titleInputRef.current?.select();
              }
            }}
            className="flex items-center flex-1 min-w-0 cursor-text group py-1"
          >
            <input
              ref={titleInputRef}
              type="text"
              value={baseName}
              onChange={(e) => onTitleChange(`${e.target.value}${extension}`)}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              onFocus={(e) => (e.target as HTMLInputElement).select()}
              disabled={category !== 'markdown'}
              placeholder="Filename"
              className="text-lg font-bold font-editor-mono font-mono text-white bg-transparent focus:outline-none placeholder-zinc-600 disabled:opacity-70 max-w-full cursor-text"
              style={{ width: `${Math.max(baseName.length, 1) + 1}ch` }}
            />
            {extension && (
              <span className="text-lg font-bold font-editor-mono font-mono text-white/40 select-none shrink-0 pointer-events-none">
                {extension}
              </span>
            )}
            {/* Extended Hit Area to the right */}
            <div className="flex-1 h-full min-w-[20px] self-stretch" />
          </div>

          {/* Width Mode Toggle (Hidden in Split View, Pure Icon without text) */}
          {!isSplitView && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsFullWidth(!isFullWidth)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition"
                title={isFullWidth ? 'Standard Width' : 'Full Width'}
              >
                {isFullWidth ? (
                  <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Formatting Toolbar (Only visible in Markdown edit mode or split view) */}
        {hasFormattingToolbar && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1 border-t border-white/10 select-none">
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

            <button
              onClick={() => insertFormatting('$$\n', '\n$$')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-blue-400 hover:text-blue-300 transition flex items-center gap-1 text-[11px] font-editor-mono font-mono"
              title="Insert LaTeX Formula ($$...$$)"
            >
              <Sigma className="w-3.5 h-3.5 text-blue-400" />
              <span>LaTeX</span>
            </button>

            <button
              onClick={() => insertFormatting('```mermaid\ngraph TD\n  A[Start] --> B(Process)\n  B --> C{Decision}\n  C -->|Yes| D[End]\n  C -->|No| B\n', '```')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-blue-400 hover:text-blue-300 transition flex items-center gap-1 text-[11px] font-editor-mono font-mono"
              title="Insert Mermaid Diagram (```mermaid)"
            >
              <GitBranch className="w-3.5 h-3.5 text-blue-400" />
              <span>Mermaid</span>
            </button>
          </div>
        )}
      </div>

      {/* Editor / Preview Canvas Container */}
      <div
        className={`absolute inset-0 z-10 flex flex-col w-full mx-auto transition-all duration-300 ${
          isSplitView || isFullWidth ? 'max-w-full' : 'max-w-[45em]'
        }`}
      >
        {/* Markdown Split View Mode: Dual-Pane Synchronous Scrolling */}
        {category === 'markdown' && isSplitView && (
          <div className="flex-1 flex w-full h-full overflow-hidden">
            {/* Left Column: Markdown Editor */}
            <div
              ref={editScrollRef}
              onScroll={handleEditScroll}
              className="w-1/2 h-full overflow-y-auto border-r border-white/10 font-editor-mono font-mono text-sm leading-6 relative"
            >
              {/* Dynamic Top Toolbar Spacing */}
              <div className={topToolbarSpacingClass} />

              <div className="flex w-full min-h-[calc(100%-13rem)]">
                <div className="w-10 sm:w-12 py-6 pr-2 sm:pr-3 text-right select-none text-zinc-500 font-editor-mono font-mono text-xs leading-6 shrink-0 border-r border-white/5 space-y-0 opacity-60">
                  {lines.map((_, i) => (
                    <div
                      key={i}
                      style={{ height: lineHeights[i] ? `${lineHeights[i]}px` : '24px' }}
                      className="flex items-start justify-end leading-6"
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => onContentChange(e.target.value)}
                  onSelect={handleSelectionChange}
                  onKeyUp={handleSelectionChange}
                  onClick={handleSelectionChange}
                  placeholder="Write your thoughts..."
                  className="flex-1 py-6 px-4 bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none resize-none font-editor-mono font-mono text-sm leading-6 relative z-10 whitespace-pre-wrap break-words selection:bg-blue-500/30 selection:text-white overflow-hidden scrollbar-none"
                />
              </div>

              {/* Dynamic Bottom Status Capsule Spacing */}
              <div className={bottomCapsuleSpacingClass} />
            </div>

            {/* Right Column: Markdown Rich Preview */}
            <div
              ref={previewScrollRef}
              onScroll={handlePreviewScroll}
              className="w-1/2 h-full overflow-y-auto font-preview-body font-sans text-sm leading-relaxed text-zinc-200 relative"
            >
              {/* Dynamic Top Toolbar Spacing */}
              <div className={topToolbarSpacingClass} />

              <div className="px-6 sm:px-8 py-6 markdown-preview">
                <div
                  dangerouslySetInnerHTML={{
                    __html: previewHtml,
                  }}
                />
              </div>

              {/* Dynamic Bottom Status Capsule Spacing */}
              <div className={bottomCapsuleSpacingClass} />
            </div>
          </div>
        )}

        {/* Markdown Single Pane Edit Mode */}
        {category === 'markdown' && !isSplitView && !isPreview && (
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto relative w-full h-full font-editor-mono font-mono text-sm leading-6"
          >
            {/* Dynamic Top Toolbar Spacing */}
            <div className={topToolbarSpacingClass} />

            <div className="flex w-full min-h-[calc(100%-13rem)]">
              {/* Left Line Number Gutter Column */}
              <div className="w-12 py-6 pr-3 text-right select-none text-zinc-500 font-editor-mono font-mono text-xs leading-6 shrink-0 border-r border-white/5 space-y-0 opacity-60">
                {lines.map((_, i) => (
                  <div
                    key={i}
                    style={{ height: lineHeights[i] ? `${lineHeights[i]}px` : '24px' }}
                    className="flex items-start justify-end leading-6"
                  >
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
                className="flex-1 py-6 px-4 bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none resize-none font-editor-mono font-mono text-sm leading-6 relative z-10 whitespace-pre-wrap break-words selection:bg-blue-500/30 selection:text-white overflow-hidden scrollbar-none"
              />
            </div>

            {/* Dynamic Bottom Status Capsule Spacing */}
            <div className={bottomCapsuleSpacingClass} />
          </div>
        )}

        {/* Markdown Single Pane Rich Preview Mode */}
        {category === 'markdown' && !isSplitView && isPreview && (
          <div className="flex-1 overflow-y-auto w-full h-full font-preview-body font-sans text-sm leading-relaxed text-zinc-200">
            {/* Dynamic Top Toolbar Spacing (Compact when no formatting toolbar) */}
            <div className={topToolbarSpacingClass} />

            <div className="p-8 pt-4 markdown-preview">
              <div
                dangerouslySetInnerHTML={{
                  __html: previewHtml,
                }}
              />
            </div>

            {/* Dynamic Bottom Status Capsule Spacing */}
            <div className={bottomCapsuleSpacingClass} />
          </div>
        )}

        {category === 'image' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className={topToolbarSpacingClass} />
            <img
              src={content}
              alt={title}
              className="max-h-[60vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
            <p className="text-xs text-zinc-400 font-editor-mono font-mono">{activeFile.filename}</p>
            <div className={bottomCapsuleSpacingClass} />
          </div>
        )}

        {category === 'audio' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className={topToolbarSpacingClass} />
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center gap-4 shadow-2xl max-w-md w-full">
              <Music className="w-12 h-12 text-blue-400 animate-pulse" />
              <audio controls src={content} className="w-full" />
              <p className="text-xs text-zinc-400 font-editor-mono font-mono">{activeFile.filename}</p>
            </div>
            <div className={bottomCapsuleSpacingClass} />
          </div>
        )}

        {category === 'video' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className={topToolbarSpacingClass} />
            <video
              controls
              src={content}
              className="max-h-[60vh] max-w-full rounded-2xl shadow-2xl border border-white/10"
            />
            <p className="text-xs text-zinc-400 font-editor-mono font-mono">{activeFile.filename}</p>
            <div className={bottomCapsuleSpacingClass} />
          </div>
        )}

        {category === 'binary' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className={topToolbarSpacingClass} />
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
            <div className={bottomCapsuleSpacingClass} />
          </div>
        )}
      </div>
    </main>
  );
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

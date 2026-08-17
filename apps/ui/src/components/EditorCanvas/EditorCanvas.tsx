import React, { useEffect, useRef, useState, useMemo } from 'react';
import { FileText, AlertCircle, Music } from 'lucide-react';
import mermaid from 'mermaid';
import { normalizeMermaidCode } from '../../services/MarkdownPreviewService';
import { useApp } from '../../context/AppContext';
import { VisualTableEditor } from '../VisualTableEditor';
import {
  findTableAtCursor,
  findAllTablesInDocument,
  DetectedTableRange,
} from '../../utils/TableConverter';
import { EditorCanvasProps } from './EditorCanvas.types';
import { useLineHeights } from './hooks/useLineHeights';
import { useSmartList } from './hooks/useSmartList';
import { EditorHeader } from './EditorHeader';
import { FormattingToolbar } from './FormattingToolbar';
import { LineGutter } from './LineGutter';
import { MarkdownPreviewPane } from './MarkdownPreviewPane';

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  activeFile,
  title,
  onTitleChange,
  content,
  onContentChange,
  isPreview,
  isSplitView,
  hasBottomCapsule = false,
  onDownloadFile,
  onSelectionStatsChange,
}) => {
  const { previewService } = useApp();

  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isFullWidth, setIsFullWidth] = useState<boolean>(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(0);

  // Visual Table Editor Modal State
  const [isVisualTableOpen, setIsVisualTableOpen] = useState(false);
  const [activeTableRange, setActiveTableRange] = useState<DetectedTableRange | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScrollRef = useRef<'editor' | 'preview' | null>(null);

  const category = activeFile?.category || 'markdown';
  const lines = useMemo(() => content.split('\n'), [content]);

  // Use custom hook for wrapped line heights
  const { lineHeights, mirrorRef, textareaRef } = useLineHeights(lines, content, isSplitView);

  // Selection change handler
  const handleSelectionChange = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Track active cursor line index
    const textBeforeCursor = content.substring(0, start);
    const lineIdx = textBeforeCursor.split('\n').length - 1;
    setActiveLineIndex(lineIdx);

    if (start !== end && onSelectionStatsChange) {
      const selectedText = content.substring(start, end);
      const selWords = selectedText.trim() ? selectedText.trim().split(/\s+/).length : 0;
      const selChars = selectedText.length;
      onSelectionStatsChange(selWords, selChars);
    } else if (onSelectionStatsChange) {
      onSelectionStatsChange(0, 0);
    }
  };

  // Smart list auto-continuation hook
  const { handleEditorKeyDown } = useSmartList(
    category,
    onContentChange,
    handleSelectionChange,
    textareaRef
  );

  // Live document-wide table detection
  const documentTables = useMemo(() => {
    if (category !== 'markdown') return [];
    return findAllTablesInDocument(content);
  }, [content, category]);

  // Real-time Markdown live parsing & rendering with KaTeX and Mermaid diagrams
  useEffect(() => {
    if (category !== 'markdown') return;

    let isMounted = true;
    const renderMarkdown = () => {
      try {
        const html = previewService.renderPreview(content);
        if (isMounted) {
          setPreviewHtml(html);
          setTimeout(() => {
            if (isMounted) {
              try {
                mermaid.initialize({
                  startOnLoad: false,
                  theme: 'dark',
                  securityLevel: 'loose',
                  fontFamily: 'inherit',
                });
                const mermaidNodes = document.querySelectorAll<HTMLElement>(
                  '.markdown-preview .mermaid:not([data-processed="true"])'
                );
                mermaidNodes.forEach((element, idx) => {
                  const id = `mermaid-svg-${Date.now()}-${idx}`;
                  const rawCode = element.textContent || '';
                  const cleanCode = normalizeMermaidCode(rawCode);

                  mermaid
                    .render(id, cleanCode)
                    .then(({ svg }) => {
                      if (isMounted) {
                        element.innerHTML = svg;
                        element.setAttribute('data-processed', 'true');
                      }
                    })
                    .catch((err) => {
                      console.warn('Mermaid rendering error:', err);
                      if (isMounted) {
                        element.innerHTML = `<div class="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl font-mono">Mermaid Syntax Error: ${err?.message || 'Invalid diagram format'}</div>`;
                        element.setAttribute('data-processed', 'true');
                      }
                    });
                });
              } catch (err) {
                console.warn('Mermaid processing warning', err);
              }
            }
          }, 50);
        }
      } catch (err) {
        console.error('Markdown rendering error', err);
      }
    };

    renderMarkdown();
    return () => {
      isMounted = false;
    };
  }, [content, category, previewService]);

  // Synchronized Dual-Column Scrolling
  const handleEditorScroll = () => {
    if (isSyncingScrollRef.current === 'preview') return;
    if (!scrollContainerRef.current || !previewScrollRef.current) return;

    isSyncingScrollRef.current = 'editor';
    const editor = scrollContainerRef.current;
    const preview = previewScrollRef.current;

    const editorScrollRatio = editor.scrollTop / (editor.scrollHeight - editor.clientHeight || 1);
    preview.scrollTop = editorScrollRatio * (preview.scrollHeight - preview.clientHeight);

    setTimeout(() => {
      if (isSyncingScrollRef.current === 'editor') {
        isSyncingScrollRef.current = null;
      }
    }, 50);
  };

  const handlePreviewScroll = () => {
    if (isSyncingScrollRef.current === 'editor') return;
    if (!scrollContainerRef.current || !previewScrollRef.current) return;

    isSyncingScrollRef.current = 'preview';
    const editor = scrollContainerRef.current;
    const preview = previewScrollRef.current;

    const previewScrollRatio = preview.scrollTop / (preview.scrollHeight - preview.clientHeight || 1);
    editor.scrollTop = previewScrollRatio * (editor.scrollHeight - editor.clientHeight);

    setTimeout(() => {
      if (isSyncingScrollRef.current === 'preview') {
        isSyncingScrollRef.current = null;
      }
    }, 50);
  };

  // Insert markdown formatting wrapper
  const insertFormatting = (prefix: string, suffix = '', isBlock = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    let replacement = '';
    let newCursorPos = 0;

    if (isBlock) {
      const beforeCursor = content.substring(0, start);
      const afterCursor = content.substring(end);
      const needsLeadingNewline = beforeCursor.length > 0 && !beforeCursor.endsWith('\n\n');
      const lead = needsLeadingNewline ? '\n\n' : '';
      replacement = `${lead}${prefix}${selectedText}${suffix}\n`;
      onContentChange(beforeCursor + replacement + afterCursor);
      newCursorPos = start + lead.length + prefix.length + selectedText.length;
    } else {
      replacement = `${prefix}${selectedText || 'text'}${suffix}`;
      onContentChange(content.substring(0, start) + replacement + content.substring(end));
      newCursorPos = selectedText ? start + replacement.length : start + prefix.length;
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        selectedText ? newCursorPos : start + prefix.length,
        selectedText ? newCursorPos : start + prefix.length + (selectedText ? 0 : 4)
      );
      handleSelectionChange();
    }, 0);
  };

  // Open Visual Table Editor
  const handleOpenVisualTable = () => {
    const textarea = textareaRef.current;
    const cursorOffset = textarea?.selectionStart ?? 0;
    const detected = findTableAtCursor(content, cursorOffset);

    if (detected) {
      setActiveTableRange(detected);
      setIsVisualTableOpen(true);
    } else {
      const start = textarea?.selectionStart ?? content.length;
      const end = textarea?.selectionEnd ?? content.length;

      setActiveTableRange({
        startOffset: start,
        endOffset: end,
        startLine: 0,
        endLine: 0,
        tableMarkdown: '',
        parsed: {
          headers: ['', '', ''],
          alignments: ['left', 'left', 'left'],
          rows: [
            ['', '', ''],
            ['', '', ''],
          ],
        },
      });
      setIsVisualTableOpen(true);
    }
  };

  // Select entire line on clicking line number in gutter
  const handleSelectLine = (lineIndex: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const linesArr = content.split('\n');
    if (lineIndex < 0 || lineIndex >= linesArr.length) return;

    let startOffset = 0;
    for (let i = 0; i < lineIndex; i++) {
      startOffset += linesArr[i].length + 1;
    }

    const lineLen = linesArr[lineIndex].length;
    const hasNewline = lineIndex < linesArr.length - 1;
    const endOffset = startOffset + lineLen + (hasNewline ? 1 : 0);

    textarea.focus();
    textarea.setSelectionRange(startOffset, endOffset);
    handleSelectionChange();
  };

  if (!activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 font-editor-mono font-mono text-sm select-none">
        <FileText className="w-12 h-12 mb-3 opacity-20 text-blue-400" />
        <p>Select or create a note to begin</p>
      </div>
    );
  }

  const hasFormattingToolbar = category === 'markdown' && (!isPreview || isSplitView);
  const topToolbarSpacingClass = hasFormattingToolbar ? 'h-24' : 'h-16';
  const bottomCapsuleSpacingClass = hasBottomCapsule ? 'h-24' : 'h-12';

  return (
    <main className="flex-1 flex flex-col h-full glass-panel rounded-glass-lg border border-white/10 relative overflow-hidden shadow-2xl">
      {/* Hidden line measurement mirror */}
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
            style={{
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              minHeight: '24px',
            }}
          >
            {line === '' ? '\u00A0' : line}
          </div>
        ))}
      </div>

      {/* Floating Frosted Glass Header & Toolbar */}
      <div className="absolute top-0 inset-x-0 z-30 px-6 pt-3 pb-2.5 glass-bar border-b border-white/10 flex flex-col justify-center space-y-2 shadow-md pointer-events-auto min-h-[52px]">
        <EditorHeader
          title={title}
          onTitleChange={onTitleChange}
          category={category}
          isFullWidth={isFullWidth}
          onToggleFullWidth={() => setIsFullWidth(!isFullWidth)}
          showFullWidthToggle={category === 'markdown'}
        />

        {hasFormattingToolbar && (
          <FormattingToolbar
            onInsertFormatting={insertFormatting}
            onOpenVisualTable={handleOpenVisualTable}
          />
        )}
      </div>

      {/* Editor Content Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Binary / Media / Non-Markdown Files */}
        {category !== 'markdown' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            {category === 'image' && (
              <div className="max-w-2xl max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 p-2 glass-panel">
                <img
                  src={content}
                  alt={activeFile.filename}
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
            )}

            {category === 'video' && (
              <div className="max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 glass-panel">
                <video src={content} controls className="w-full h-auto rounded-xl" />
              </div>
            )}

            {category === 'audio' && (
              <div className="w-full max-w-md p-6 glass-panel rounded-2xl border border-white/10 space-y-4">
                <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400 w-16 h-16 mx-auto flex items-center justify-center">
                  <Music className="w-8 h-8" />
                </div>
                <h3 className="font-mono text-sm text-white font-semibold">{activeFile.filename}</h3>
                <audio src={content} controls className="w-full" />
              </div>
            )}

            {category === 'binary' && (
              <div className="p-8 glass-panel rounded-2xl border border-white/10 max-w-md space-y-4">
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
                <h3 className="text-base font-bold text-white">Binary / Unsupported File</h3>
                <p className="text-xs text-zinc-400 font-mono">
                  This file cannot be previewed directly in the browser.
                </p>
                {onDownloadFile && (
                  <button
                    onClick={onDownloadFile}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-mono transition shadow-lg cursor-pointer"
                  >
                    Download Decrypted File
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Markdown Dual-Column Split View */}
        {category === 'markdown' && isSplitView && (
          <div className="flex-1 flex w-full h-full overflow-hidden divide-x divide-white/10">
            {/* Left Column: Code Editor */}
            <div
              ref={scrollContainerRef}
              onScroll={handleEditorScroll}
              className="w-1/2 h-full overflow-y-auto relative font-editor-mono font-mono text-sm leading-6"
            >
              <div className={topToolbarSpacingClass} />

              <div className="flex w-full min-h-[calc(100%-13rem)]">
                <LineGutter
                  lines={lines}
                  lineHeights={lineHeights}
                  activeLineIndex={activeLineIndex}
                  documentTables={documentTables}
                  onSelectLine={handleSelectLine}
                  onOpenTableAtRange={(tbl) => {
                    setActiveTableRange(tbl);
                    setIsVisualTableOpen(true);
                  }}
                />
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => {
                    onContentChange(e.target.value);
                    handleSelectionChange();
                  }}
                  onSelect={handleSelectionChange}
                  onKeyUp={handleSelectionChange}
                  onKeyDown={handleEditorKeyDown}
                  onClick={handleSelectionChange}
                  onFocus={handleSelectionChange}
                  placeholder="Write your thoughts..."
                  className="flex-1 px-4 bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none resize-none font-editor-mono font-mono text-sm leading-6 relative z-10 whitespace-pre-wrap break-words selection:bg-blue-500/30 selection:text-white overflow-hidden scrollbar-none"
                />
              </div>

              <div className={bottomCapsuleSpacingClass} />
            </div>

            {/* Right Column: Markdown Rich Preview */}
            <MarkdownPreviewPane
              previewRef={previewScrollRef}
              previewHtml={previewHtml}
              onScroll={handlePreviewScroll}
              topToolbarSpacingClass={topToolbarSpacingClass}
              bottomCapsuleSpacingClass={bottomCapsuleSpacingClass}
              isSplitView={true}
            />
          </div>
        )}

        {/* Markdown Single Pane Edit Mode */}
        {category === 'markdown' && !isSplitView && !isPreview && (
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto relative w-full h-full font-editor-mono font-mono text-sm leading-6"
          >
            <div className={topToolbarSpacingClass} />

            <div
              className={`flex min-h-[calc(100%-13rem)] transition-all duration-300 ${
                isFullWidth
                  ? 'w-full px-4 sm:px-8'
                  : 'w-full max-w-4xl mx-auto px-4 sm:px-6'
              }`}
            >
              <LineGutter
                lines={lines}
                lineHeights={lineHeights}
                activeLineIndex={activeLineIndex}
                documentTables={documentTables}
                onSelectLine={handleSelectLine}
                onOpenTableAtRange={(tbl) => {
                  setActiveTableRange(tbl);
                  setIsVisualTableOpen(true);
                }}
              />

              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  onContentChange(e.target.value);
                  handleSelectionChange();
                }}
                onSelect={handleSelectionChange}
                onKeyUp={handleSelectionChange}
                onKeyDown={handleEditorKeyDown}
                onClick={handleSelectionChange}
                onFocus={handleSelectionChange}
                placeholder="Write your thoughts..."
                className="flex-1 px-4 bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none resize-none font-editor-mono font-mono text-sm leading-6 relative z-10 whitespace-pre-wrap break-words selection:bg-blue-500/30 selection:text-white overflow-hidden scrollbar-none"
              />
            </div>

            <div className={bottomCapsuleSpacingClass} />
          </div>
        )}

        {/* Markdown Single Pane Preview Mode */}
        {category === 'markdown' && !isSplitView && isPreview && (
          <MarkdownPreviewPane
            previewRef={scrollContainerRef}
            previewHtml={previewHtml}
            onScroll={() => {}}
            topToolbarSpacingClass={topToolbarSpacingClass}
            bottomCapsuleSpacingClass={bottomCapsuleSpacingClass}
            isSplitView={false}
            isFullWidth={isFullWidth}
          />
        )}
      </div>

      {/* Visual Table Editor Modal */}
      {isVisualTableOpen && activeTableRange && (
        <VisualTableEditor
          initialData={activeTableRange.parsed}
          onSave={(newTableMd) => {
            const before = content.substring(0, activeTableRange.startOffset);
            const after = content.substring(activeTableRange.endOffset);
            const nextContent = before + newTableMd + after;
            onContentChange(nextContent);
            setIsVisualTableOpen(false);
            setActiveTableRange(null);
          }}
          onClose={() => {
            setIsVisualTableOpen(false);
            setActiveTableRange(null);
          }}
        />
      )}
    </main>
  );
};

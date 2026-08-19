import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { VisualTableEditor } from '../VisualTableEditor';
import { EditorCanvasProps } from './EditorCanvas.types';
import {
  useLineHeights,
  useSmartList,
  useMarkdownPreview,
  useSyncScroll,
  useEditorFormatting,
  useFindReplace,
} from './hooks';
import { EditorHeader } from './EditorHeader';
import { FormattingToolbar } from './FormattingToolbar';
import { LineGutter } from './LineGutter';
import { MarkdownPreviewPane } from './MarkdownPreviewPane';
import { MediaPreview } from './MediaPreview';
import { EditorCodeArea } from './EditorCodeArea';
import { FindReplaceBar } from './FindReplaceBar';

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
  const { previewService, highlightService } = useApp();

  const [isFullWidth, setIsFullWidth] = useState<boolean>(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(0);

  const category = activeFile?.category || 'markdown';
  const lines = useMemo(() => content.split('\n'), [content]);

  // Hook: Calculate dynamic wrapped line heights
  const { lineHeights, mirrorRef, textareaRef } = useLineHeights(
    lines,
    content,
    isSplitView,
    isPreview,
    isFullWidth
  );

  // Hook: Find & Replace
  const findReplace = useFindReplace({
    content,
    onContentChange,
    textareaRef,
  });

  // Track active line and selection word/char counts
  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

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
  }, [content, onSelectionStatsChange, textareaRef]);

  // Hook: Smart list markdown auto-continuation
  const { handleEditorKeyDown } = useSmartList(
    category,
    onContentChange,
    handleSelectionChange,
    textareaRef
  );

  // Handle keyboard shortcuts (Ctrl+F for Find, Ctrl+H for Replace)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        findReplace.openFind();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        findReplace.openReplace();
        return;
      }
      handleEditorKeyDown(e);
    },
    [findReplace, handleEditorKeyDown]
  );

  // Hook: Real-time Markdown live parsing & Mermaid rendering
  const { previewHtml } = useMarkdownPreview(content, category, previewService);

  // Hook: Synchronized Dual-Column Scrolling (Split View)
  const {
    scrollContainerRef,
    previewScrollRef,
    handleEditorScroll,
    handlePreviewScroll,
  } = useSyncScroll();

  // Dedicated Persistent Scroll Refs for Single-Pane Modes
  const singleEditorScrollRef = useRef<HTMLDivElement>(null);
  const singlePreviewScrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll position to top when active file changes
  useEffect(() => {
    if (singleEditorScrollRef.current) singleEditorScrollRef.current.scrollTop = 0;
    if (singlePreviewScrollRef.current) singlePreviewScrollRef.current.scrollTop = 0;
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    if (previewScrollRef.current) previewScrollRef.current.scrollTop = 0;
  }, [activeFile?.id, scrollContainerRef, previewScrollRef]);

  const { t } = useI18n();

  // Scroll to Top Handler
  const handleScrollToTop = useCallback(() => {
    if (category !== 'markdown') return;

    if (isSplitView) {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      previewScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (isPreview) {
      singlePreviewScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      singleEditorScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [category, isSplitView, isPreview, scrollContainerRef, previewScrollRef]);

  // Scroll to Bottom Handler
  const handleScrollToBottom = useCallback(() => {
    if (category !== 'markdown') return;

    if (isSplitView) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
      if (previewScrollRef.current) {
        previewScrollRef.current.scrollTo({
          top: previewScrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    } else if (isPreview) {
      if (singlePreviewScrollRef.current) {
        singlePreviewScrollRef.current.scrollTo({
          top: singlePreviewScrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    } else {
      if (singleEditorScrollRef.current) {
        singleEditorScrollRef.current.scrollTo({
          top: singleEditorScrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [category, isSplitView, isPreview, scrollContainerRef, previewScrollRef]);

  // Hook: Editor formatting, line selection, and Visual Table Editor integration
  const {
    documentTables,
    isVisualTableOpen,
    activeTableRange,
    insertFormatting,
    handleOpenVisualTable,
    handleSaveVisualTable,
    handleCloseVisualTable,
    handleSelectLine,
  } = useEditorFormatting({
    content,
    category,
    onContentChange,
    handleSelectionChange,
    textareaRef,
  });

  if (!activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 font-editor-mono font-mono text-sm select-none">
        <FileText className="w-12 h-12 mb-3 opacity-20 text-primaryColor-500 dark:text-primaryColor-400" />
        <p>Select or create a note to begin</p>
      </div>
    );
  }

  const hasFormattingToolbar = category === 'markdown' && (!isPreview || isSplitView);
  const topToolbarSpacingClass = hasFormattingToolbar ? 'h-28' : 'h-20';
  const bottomCapsuleSpacingClass = hasBottomCapsule ? 'h-24' : 'h-12';

  return (
    <main className="flex-1 flex flex-col h-full bg-white/85 dark:bg-[#121216]/85 rounded-glass-lg border border-black/10 dark:border-white/10 relative overflow-hidden shadow-xl dark:shadow-2xl transition-colors">
      {/* Hidden line measurement mirror */}
      <div
        ref={mirrorRef}
        aria-hidden="true"
        className="absolute opacity-0 pointer-events-none font-editor-mono font-mono text-[15px] leading-6"
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
      <div className="absolute top-0 inset-x-0 z-30 px-6 pt-3 pb-2.5 glass-bar backdrop-blur-[10px] border-b border-black/5 dark:border-white/10 flex flex-col justify-center space-y-2 shadow-md pointer-events-auto min-h-[52px]">
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
            onToggleFindReplace={() =>
              findReplace.isOpen
                ? findReplace.closeFindReplace()
                : findReplace.openFind()
            }
            isFindOpen={findReplace.isOpen}
          />
        )}
      </div>

      {/* Floating Find & Replace Panel */}
      <FindReplaceBar
        isOpen={findReplace.isOpen}
        isReplaceMode={findReplace.isReplaceMode}
        setIsReplaceMode={findReplace.setIsReplaceMode}
        searchQuery={findReplace.searchQuery}
        setSearchQuery={findReplace.setSearchQuery}
        replaceQuery={findReplace.replaceQuery}
        setReplaceQuery={findReplace.setReplaceQuery}
        isRegex={findReplace.isRegex}
        setIsRegex={findReplace.setIsRegex}
        isCaseSensitive={findReplace.isCaseSensitive}
        setIsCaseSensitive={findReplace.setIsCaseSensitive}
        isWholeWord={findReplace.isWholeWord}
        setIsWholeWord={findReplace.setIsWholeWord}
        matchesCount={findReplace.matches.length}
        currentMatchIndex={findReplace.currentMatchIndex}
        regexError={findReplace.regexError}
        onFindNext={findReplace.findNext}
        onFindPrev={findReplace.findPrev}
        onReplaceCurrent={findReplace.replaceCurrent}
        onReplaceAll={findReplace.replaceAll}
        onClose={findReplace.closeFindReplace}
      />

      {/* Editor Content Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Binary / Media / Non-Markdown Files */}
        {category !== 'markdown' && (
          <MediaPreview
            category={category}
            content={content}
            filename={activeFile.filename}
            onDownloadFile={onDownloadFile}
          />
        )}

        {/* Markdown Dual-Column Split View */}
        {category === 'markdown' && isSplitView && (
          <div
            className={`flex-1 flex h-full overflow-hidden divide-x divide-black/10 dark:divide-white/10 transition-all duration-300 ${
              isFullWidth ? 'w-full px-2 sm:px-4' : 'w-full max-w-7xl mx-auto px-2 sm:px-4'
            }`}
          >
            {/* Left Column: Code Editor */}
            <div
              ref={scrollContainerRef}
              onScroll={handleEditorScroll}
              className="w-1/2 h-full overflow-y-auto relative font-editor-mono font-mono text-sm leading-6"
            >
              <div className={topToolbarSpacingClass} />

              <div className="flex w-full min-h-[calc(100%-13rem)] px-2 sm:px-4">
                <LineGutter
                  lines={lines}
                  lineHeights={lineHeights}
                  activeLineIndex={activeLineIndex}
                  documentTables={documentTables}
                  onSelectLine={handleSelectLine}
                  onOpenTableAtRange={handleOpenVisualTable}
                />
                <EditorCodeArea
                  textareaRef={textareaRef}
                  value={content}
                  onChange={onContentChange}
                  onSelectionChange={handleSelectionChange}
                  onKeyDown={handleKeyDown}
                  highlightService={highlightService}
                  category={category}
                  placeholder="Write your thoughts..."
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
              isFullWidth={isFullWidth}
            />
          </div>
        )}

        {/* Markdown Single Pane Edit Mode (Persistent DOM) */}
        {category === 'markdown' && !isSplitView && (
          <div
            ref={singleEditorScrollRef}
            className={`flex-1 overflow-y-auto relative w-full h-full font-editor-mono font-mono text-sm leading-6 ${
              !isPreview ? 'block' : 'hidden'
            }`}
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
                onOpenTableAtRange={handleOpenVisualTable}
              />

              <EditorCodeArea
                textareaRef={textareaRef}
                value={content}
                onChange={onContentChange}
                onSelectionChange={handleSelectionChange}
                onKeyDown={handleKeyDown}
                highlightService={highlightService}
                category={category}
                placeholder="Write your thoughts..."
              />
            </div>

            <div className={bottomCapsuleSpacingClass} />
          </div>
        )}

        {/* Markdown Single Pane Preview Mode (Persistent DOM) */}
        {category === 'markdown' && !isSplitView && (
          <div className={`flex-1 w-full h-full overflow-hidden ${isPreview ? 'flex flex-col' : 'hidden'}`}>
            <MarkdownPreviewPane
              previewRef={singlePreviewScrollRef}
              previewHtml={previewHtml}
              onScroll={() => {}}
              topToolbarSpacingClass={topToolbarSpacingClass}
              bottomCapsuleSpacingClass={bottomCapsuleSpacingClass}
              isSplitView={false}
              isFullWidth={isFullWidth}
            />
          </div>
        )}
      </div>

      {/* Elevator Floating Scroll Controls (Scroll to Top / Bottom) */}
      {category === 'markdown' && (
        <div className="absolute bottom-7 right-5 sm:right-6 z-30 flex flex-col gap-2 select-none pointer-events-auto">
          <button
            type="button"
            onClick={handleScrollToTop}
            className="w-9 h-9 rounded-full glass-capsule backdrop-blur-[10px] flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-[var(--accent-primary)] dark:hover:text-[var(--accent-primary-light)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors shadow-lg border border-black/10 dark:border-white/10 cursor-pointer"
            title={t('scrollToTop') || 'Scroll to top'}
            aria-label={t('scrollToTop') || 'Scroll to top'}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleScrollToBottom}
            className="w-9 h-9 rounded-full glass-capsule backdrop-blur-[10px] flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-[var(--accent-primary)] dark:hover:text-[var(--accent-primary-light)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors shadow-lg border border-black/10 dark:border-white/10 cursor-pointer"
            title={t('scrollToBottom') || 'Scroll to bottom'}
            aria-label={t('scrollToBottom') || 'Scroll to bottom'}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Visual Table Editor Modal */}
      {isVisualTableOpen && activeTableRange && (
        <VisualTableEditor
          initialData={activeTableRange.parsed}
          onSave={handleSaveVisualTable}
          onClose={handleCloseVisualTable}
        />
      )}
    </main>
  );
};

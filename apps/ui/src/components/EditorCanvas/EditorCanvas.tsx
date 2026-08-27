import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { VisualTableEditor } from '../VisualTableEditor';
import { EditorCanvasProps } from './EditorCanvas.types';
import {
  useHeightMap,
  useSmartList,
  useMarkdownPreview,
  useSyncScroll,
  useEditorFormatting,
  useFindReplace,
} from './hooks';
import { EditorHeaderBar } from './EditorHeaderBar';
import { LineMeasurementMirror } from './LineMeasurementMirror';
import { EditorDualSplitPane } from './EditorDualSplitPane';
import { EditorSinglePane } from './EditorSinglePane';
import { EditorMobileBottomToolbar } from './EditorMobileBottomToolbar';
import { MediaPreview } from './MediaPreview';
import { FindReplaceBar } from './FindReplaceBar';
import { ScrollElevatorControls } from './ScrollElevatorControls';

/**
 * EditorCanvas
 * Main document canvas orchestrator for markdown editing, live preview, and media display.
 */
export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  activeFile,
  title,
  onTitleChange,
  content,
  onContentChange,
  isPreview,
  isSplitView,
  hasBottomCapsule = false,
  isDecryptingFile = false,
  decryptingFileName = null,
  onDownloadFile,
  onSelectionStatsChange,
}) => {
  const { previewService, highlightService } = useApp();
  const { t } = useI18n();

  const [isFullWidth, setIsFullWidth] = useState<boolean>(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(0);

  const category = activeFile?.category || 'markdown';
  const lines = useMemo(() => content.split('\n'), [content]);

  // Hook: Calculate dynamic wrapped line heights and coordinate mapping (Height Map)
  const { heightMap, mirrorRef, textareaRef } = useHeightMap(
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
    [handleEditorKeyDown, findReplace]
  );

  // Hook: Markdown HTML preview rendering
  const { previewHtml } = useMarkdownPreview(
    content,
    category,
    previewService
  );

  // Hook: Split-view synchronous scroll
  const {
    scrollContainerRef,
    previewScrollRef,
    handleEditorScroll,
    handlePreviewScroll,
  } = useSyncScroll();

  // Single Pane Viewport Scroll Refs
  const singleEditorScrollRef = useRef<HTMLDivElement>(null);
  const singlePreviewScrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll position to top when active file changes
  useEffect(() => {
    if (singleEditorScrollRef.current) singleEditorScrollRef.current.scrollTop = 0;
    if (singlePreviewScrollRef.current) singlePreviewScrollRef.current.scrollTop = 0;
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    if (previewScrollRef.current) previewScrollRef.current.scrollTop = 0;
  }, [activeFile?.id, scrollContainerRef, previewScrollRef]);

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
    if (isDecryptingFile) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-zinc-400 dark:text-zinc-500 font-editor-mono font-mono text-sm select-none animate-in fade-in duration-200">
          <div className="relative mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primaryColor-500/10 dark:bg-primaryColor-500/15 border border-primaryColor-500/20 flex items-center justify-center shadow-lg shadow-primaryColor-500/10">
              <Loader2 className="w-7 h-7 text-primaryColor-500 dark:text-primaryColor-400 animate-spin" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75" />
          </div>
          <p className="text-zinc-800 dark:text-zinc-200 font-medium text-base mb-1">
            {t('decryptingFile') || '正在解密文件明文...'}
          </p>
          {decryptingFileName && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm text-center truncate font-mono">
              {decryptingFileName}
            </p>
          )}
          <div className="mt-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>AES-256-GCM / Zero-Knowledge</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 font-editor-mono font-mono text-sm select-none">
        <FileText className="w-12 h-12 mb-3 opacity-20 text-primaryColor-500 dark:text-primaryColor-400" />
        <p>{t('selectOrCreateNote') || 'Select or create a note to begin'}</p>
      </div>
    );
  }

  const hasFormattingToolbar = category === 'markdown' && (!isPreview || isSplitView);
  const topToolbarSpacingClass = hasFormattingToolbar ? 'h-20 md:h-28' : 'h-20';
  const bottomCapsuleSpacingClass = hasBottomCapsule ? 'h-24' : 'h-12';

  return (
    <main className="flex-1 flex flex-col h-full bg-white/85 dark:bg-[#121216]/85 rounded-glass-lg border border-black/10 dark:border-white/10 relative overflow-hidden shadow-xl dark:shadow-2xl transition-colors">
      {/* 1. Hidden line measurement mirror */}
      <LineMeasurementMirror mirrorRef={mirrorRef} lines={lines} />

      {/* 2. Floating Frosted Glass Header & Desktop Formatting Toolbar */}
      <EditorHeaderBar
        title={title}
        onTitleChange={onTitleChange}
        category={category}
        isFullWidth={isFullWidth}
        onToggleFullWidth={() => setIsFullWidth(!isFullWidth)}
        hasFormattingToolbar={hasFormattingToolbar}
        onInsertFormatting={insertFormatting}
        onOpenVisualTable={handleOpenVisualTable}
        onToggleFindReplace={() =>
          findReplace.isOpen ? findReplace.closeFindReplace() : findReplace.openFind()
        }
        isFindOpen={findReplace.isOpen}
      />

      {/* 3. Floating Find & Replace Toolbar */}
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

      {/* 4. Main Content Area */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Binary / Media File Preview */}
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
          <EditorDualSplitPane
            scrollContainerRef={scrollContainerRef}
            previewScrollRef={previewScrollRef}
            handleEditorScroll={handleEditorScroll}
            handlePreviewScroll={handlePreviewScroll}
            topToolbarSpacingClass={topToolbarSpacingClass}
            bottomCapsuleSpacingClass={bottomCapsuleSpacingClass}
            heightMap={heightMap}
            activeLineIndex={activeLineIndex}
            documentTables={documentTables}
            onSelectLine={handleSelectLine}
            onOpenTableAtRange={handleOpenVisualTable}
            textareaRef={textareaRef}
            content={content}
            onContentChange={onContentChange}
            handleSelectionChange={handleSelectionChange}
            handleKeyDown={handleKeyDown}
            highlightService={highlightService}
            category={category}
            previewHtml={previewHtml}
            isFullWidth={isFullWidth}
          />
        )}

        {/* Markdown Single Pane (Edit / Preview) */}
        {category === 'markdown' && !isSplitView && (
          <EditorSinglePane
            singleEditorScrollRef={singleEditorScrollRef}
            singlePreviewScrollRef={singlePreviewScrollRef}
            isPreview={isPreview}
            isFullWidth={isFullWidth}
            topToolbarSpacingClass={topToolbarSpacingClass}
            bottomCapsuleSpacingClass={bottomCapsuleSpacingClass}
            heightMap={heightMap}
            activeLineIndex={activeLineIndex}
            documentTables={documentTables}
            onSelectLine={handleSelectLine}
            onOpenTableAtRange={handleOpenVisualTable}
            textareaRef={textareaRef}
            content={content}
            onContentChange={onContentChange}
            handleSelectionChange={handleSelectionChange}
            handleKeyDown={handleKeyDown}
            highlightService={highlightService}
            category={category}
            previewHtml={previewHtml}
          />
        )}
      </div>

      {/* 5. Elevator Floating Scroll Controls (Scroll to Top / Bottom) */}
      <ScrollElevatorControls
        onScrollToTop={handleScrollToTop}
        onScrollToBottom={handleScrollToBottom}
      />

      {/* 6. Sticky Mobile Formatting Toolbar (below md) */}
      <EditorMobileBottomToolbar
        hasFormattingToolbar={hasFormattingToolbar}
        onInsertFormatting={insertFormatting}
        onOpenVisualTable={handleOpenVisualTable}
        onToggleFindReplace={() =>
          findReplace.isOpen ? findReplace.closeFindReplace() : findReplace.openFind()
        }
        isFindOpen={findReplace.isOpen}
      />

      {/* 7. Visual Table Editor Modal */}
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

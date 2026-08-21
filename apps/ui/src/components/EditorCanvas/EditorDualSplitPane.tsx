import React from 'react';
import { IHighlightService } from '../../interfaces/IHighlightService';
import { LineGutter } from './LineGutter';
import { EditorCodeArea } from './EditorCodeArea';
import { MarkdownPreviewPane } from './MarkdownPreviewPane';
import { EditorHeightMap } from './types/HeightMap.types';
import { DetectedTableRange } from '../../utils/TableConverter';

export interface EditorDualSplitPaneProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  previewScrollRef: React.RefObject<HTMLDivElement | null>;
  handleEditorScroll: () => void;
  handlePreviewScroll: () => void;
  topToolbarSpacingClass: string;
  bottomCapsuleSpacingClass: string;
  heightMap: EditorHeightMap;
  activeLineIndex: number;
  documentTables: DetectedTableRange[];
  onSelectLine: (lineIndex: number) => void;
  onOpenTableAtRange: (range: DetectedTableRange) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  content: string;
  onContentChange: (newContent: string) => void;
  handleSelectionChange: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  highlightService: IHighlightService;
  category: string;
  previewHtml: string;
  isFullWidth: boolean;
}

/**
 * EditorDualSplitPane
 * Dual-column split view (Left: Line numbers + Code area, Right: Rich Markdown/KaTeX/Mermaid preview).
 */
export const EditorDualSplitPane: React.FC<EditorDualSplitPaneProps> = ({
  scrollContainerRef,
  previewScrollRef,
  handleEditorScroll,
  handlePreviewScroll,
  topToolbarSpacingClass,
  bottomCapsuleSpacingClass,
  heightMap,
  activeLineIndex,
  documentTables,
  onSelectLine,
  onOpenTableAtRange,
  textareaRef,
  content,
  onContentChange,
  handleSelectionChange,
  handleKeyDown,
  highlightService,
  category,
  previewHtml,
  isFullWidth,
}) => {
  return (
    <div className="flex-1 flex w-full h-full overflow-hidden divide-x divide-black/5 dark:divide-white/5">
      {/* Left Column: Markdown Code Editor */}
      <div
        ref={scrollContainerRef}
        onScroll={handleEditorScroll}
        className="w-1/2 h-full overflow-y-auto font-editor-mono font-mono text-sm leading-6 relative"
      >
        <div className={topToolbarSpacingClass} />

        <div className="flex px-4 sm:px-6 min-h-[calc(100%-13rem)]">
          <LineGutter
            heightMap={heightMap}
            activeLineIndex={activeLineIndex}
            documentTables={documentTables}
            onSelectLine={onSelectLine}
            onOpenTableAtRange={onOpenTableAtRange}
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
            minContentHeight={heightMap.totalHeight}
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
        isVisible={true}
      />
    </div>
  );
};

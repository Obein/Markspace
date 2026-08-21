import React from 'react';
import { IHighlightService } from '../../interfaces/IHighlightService';
import { LineGutter } from './LineGutter';
import { EditorCodeArea } from './EditorCodeArea';
import { MarkdownPreviewPane } from './MarkdownPreviewPane';
import { EditorHeightMap } from './types/HeightMap.types';
import { DetectedTableRange } from '../../utils/TableConverter';

export interface EditorSinglePaneProps {
  singleEditorScrollRef: React.RefObject<HTMLDivElement | null>;
  singlePreviewScrollRef: React.RefObject<HTMLDivElement | null>;
  isPreview: boolean;
  isFullWidth: boolean;
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
}

/**
 * EditorSinglePane
 * Single pane container managing persistent DOM switches between editor and preview modes.
 */
export const EditorSinglePane: React.FC<EditorSinglePaneProps> = ({
  singleEditorScrollRef,
  singlePreviewScrollRef,
  isPreview,
  isFullWidth,
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
}) => {
  return (
    <>
      {/* Markdown Single Pane Edit Mode (Persistent DOM) */}
      <div
        ref={singleEditorScrollRef}
        className={`flex-1 overflow-y-auto relative w-full h-full font-editor-mono font-mono text-sm leading-6 ${
          !isPreview ? 'block' : 'hidden'
        }`}
      >
        <div className={topToolbarSpacingClass} />

        <div
          className={`flex min-h-[calc(100%-13rem)] transition-all duration-300 ${
            isFullWidth ? 'w-full px-4 sm:px-8' : 'w-full max-w-4xl mx-auto px-4 sm:px-6'
          }`}
        >
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

      {/* Markdown Single Pane Preview Mode (Persistent DOM) */}
      <div
        className={`flex-1 w-full h-full overflow-hidden ${
          isPreview ? 'flex flex-col' : 'hidden'
        }`}
      >
        <MarkdownPreviewPane
          previewRef={singlePreviewScrollRef}
          previewHtml={previewHtml}
          onScroll={() => {}}
          topToolbarSpacingClass={topToolbarSpacingClass}
          bottomCapsuleSpacingClass={bottomCapsuleSpacingClass}
          isSplitView={false}
          isFullWidth={isFullWidth}
          isVisible={isPreview}
        />
      </div>
    </>
  );
};

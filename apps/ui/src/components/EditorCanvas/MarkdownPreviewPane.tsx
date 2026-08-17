import React from 'react';

interface MarkdownPreviewPaneProps {
  previewRef: React.RefObject<HTMLDivElement | null>;
  previewHtml: string;
  onScroll: () => void;
  topToolbarSpacingClass: string;
  bottomCapsuleSpacingClass: string;
  isSplitView?: boolean;
}

export const MarkdownPreviewPane: React.FC<MarkdownPreviewPaneProps> = ({
  previewRef,
  previewHtml,
  onScroll,
  topToolbarSpacingClass,
  bottomCapsuleSpacingClass,
  isSplitView = false,
}) => {
  return (
    <div
      ref={previewRef as any}
      onScroll={onScroll}
      className={`${
        isSplitView ? 'w-1/2' : 'flex-1 w-full max-w-4xl mx-auto'
      } h-full overflow-y-auto font-preview-body font-sans text-sm leading-relaxed text-zinc-200 relative`}
    >
      {/* Dynamic Top Toolbar Spacing */}
      <div className={topToolbarSpacingClass} />

      <div className="px-6 sm:px-8 markdown-preview">
        <div
          dangerouslySetInnerHTML={{
            __html: previewHtml,
          }}
        />
      </div>

      {/* Dynamic Bottom Status Capsule Spacing */}
      <div className={bottomCapsuleSpacingClass} />
    </div>
  );
};

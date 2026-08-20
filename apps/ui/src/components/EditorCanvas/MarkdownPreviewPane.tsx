import React, { useEffect, useRef } from 'react';
import { normalizeMermaidCode } from '../../services/MarkdownPreviewService';
import { getMermaid } from '../../utils/mermaidLoader';

interface MarkdownPreviewPaneProps {
  previewRef: React.RefObject<HTMLDivElement | null>;
  previewHtml: string;
  onScroll: () => void;
  topToolbarSpacingClass: string;
  bottomCapsuleSpacingClass: string;
  isSplitView?: boolean;
  isFullWidth?: boolean;
}

export const MarkdownPreviewPane: React.FC<MarkdownPreviewPaneProps> = ({
  previewRef,
  previewHtml,
  onScroll,
  topToolbarSpacingClass,
  bottomCapsuleSpacingClass,
  isSplitView = false,
  isFullWidth = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Directly render any Mermaid diagrams asynchronously whenever previewHtml is mounted or updated
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isMounted = true;

    // Microtask timeout to ensure dangerouslySetInnerHTML is fully committed to DOM
    const timeoutId = setTimeout(async () => {
      if (!isMounted) return;

      const mermaidNodes = container.querySelectorAll<HTMLElement>(
        '.mermaid-diagram-code:not([data-processed="true"]), .mermaid:not([data-processed="true"])'
      );

      if (mermaidNodes.length === 0) return;

      try {
        const isDark = document.documentElement.classList.contains('dark');
        const mermaid = await getMermaid(isDark);
        if (!isMounted) return;

        // Render sequentially to prevent concurrent DOM collision inside Mermaid
        for (let idx = 0; idx < mermaidNodes.length; idx++) {
          if (!isMounted) break;
          const element = mermaidNodes[idx];
          if (element.getAttribute('data-processed') === 'true') continue;

          const encoded = element.getAttribute('data-mermaid-code');
          const rawCode = encoded ? decodeURIComponent(encoded) : (element.textContent || '');
          const cleanCode = normalizeMermaidCode(rawCode);

          if (!cleanCode) continue;

          const id = `mm_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;

          try {
            const { svg, bindFunctions } = await mermaid.render(id, cleanCode);
            if (isMounted && element) {
              element.innerHTML = svg;
              element.setAttribute('data-processed', 'true');
              element.className = 'w-full flex justify-center overflow-x-auto';
              if (bindFunctions) {
                bindFunctions(element);
              }
            }
          } catch (err: any) {
            console.warn('Mermaid rendering error:', err);
            // Clean up any stray temp element created by Mermaid on failure
            const stray = document.getElementById(id);
            if (stray) stray.remove();

            if (isMounted && element) {
              element.innerHTML = `<div class="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs rounded-xl font-mono text-center">Mermaid Syntax Error: ${err?.message || 'Invalid diagram format'}</div>`;
              element.setAttribute('data-processed', 'true');
            }
          }
        }
      } catch (loadErr) {
        console.warn('Failed to dynamically load Mermaid engine', loadErr);
      }
    }, 40);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [previewHtml]);

  return (
    <div
      ref={(el) => {
        (containerRef as any).current = el;
        if (typeof previewRef === 'function') {
          (previewRef as any)(el);
        } else if (previewRef) {
          (previewRef as any).current = el;
        }
      }}
      onScroll={onScroll}
      className={`${
        isSplitView ? 'w-1/2' : 'flex-1 w-full'
      } h-full overflow-y-auto font-preview-body font-sans text-sm leading-relaxed text-zinc-900 dark:text-zinc-100 relative transition-all duration-300`}
    >
      {/* Dynamic Top Toolbar Spacing */}
      <div className={topToolbarSpacingClass} />

      <div
        className={`markdown-preview transition-all duration-300 ${
          isSplitView
            ? 'w-full px-4 sm:px-6'
            : isFullWidth
            ? 'w-full max-w-none px-6 sm:px-10'
            : 'w-full max-w-4xl mx-auto px-6 sm:px-8'
        }`}
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />

      {/* Dynamic Bottom Capsule Spacing */}
      <div className={bottomCapsuleSpacingClass} />
    </div>
  );
};

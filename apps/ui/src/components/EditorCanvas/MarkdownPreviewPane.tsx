import React, { useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../../i18n/i18nContext';
import { normalizeMermaidCode } from '../../services/MarkdownPreviewService';
import { renderMermaid } from '../../utils/mermaidLoader';

interface MarkdownPreviewPaneProps {
  previewRef: React.RefObject<HTMLDivElement | null>;
  previewHtml: string;
  onScroll: () => void;
  topToolbarSpacingClass: string;
  bottomCapsuleSpacingClass: string;
  isSplitView?: boolean;
  isFullWidth?: boolean;
  isVisible?: boolean;
}

export const MarkdownPreviewPane: React.FC<MarkdownPreviewPaneProps> = ({
  previewRef,
  previewHtml,
  onScroll,
  topToolbarSpacingClass,
  bottomCapsuleSpacingClass,
  isSplitView = false,
  isFullWidth = false,
  isVisible = true,
}) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);

  // Directly render any Mermaid diagrams whenever previewHtml is mounted/updated or DOM mutations occur
  useEffect(() => {
    if (!isVisible) return;

    const container = containerRef.current;
    if (!container) return;

    let isDisposed = false;

    const renderDiagrams = async () => {
      if (isDisposed || !container) return;

      const mermaidNodes = container.querySelectorAll<HTMLElement>(
        '.mermaid-diagram-code:not([data-processed="true"]), .mermaid:not([data-processed="true"])'
      );

      if (mermaidNodes.length === 0) return;

      const isDark = document.documentElement.classList.contains('dark');

      for (let idx = 0; idx < mermaidNodes.length; idx++) {
        if (isDisposed) break;
        const initialElement = mermaidNodes[idx];
        if (initialElement.getAttribute('data-processed') === 'true') continue;

        const encoded = initialElement.getAttribute('data-mermaid-code');
        const rawCode = encoded ? decodeURIComponent(encoded) : (initialElement.textContent || '');
        const cleanCode = normalizeMermaidCode(rawCode);

        if (!cleanCode) continue;

        try {
          const { svg, bindFunctions } = await renderMermaid(cleanCode, isDark);

          // Find the active target element in the live container DOM
          // (robust against React re-render DOM node replacements during split-view typing)
          const targetElement =
            (initialElement.isConnected && container.contains(initialElement) ? initialElement : null) ||
            (encoded
              ? container.querySelector<HTMLElement>(
                  `.mermaid-diagram-code[data-mermaid-code="${encoded}"]:not([data-processed="true"])`
                )
              : null);

          if (targetElement && !isDisposed) {
            targetElement.innerHTML = svg;
            targetElement.setAttribute('data-processed', 'true');
            targetElement.className = 'w-full flex justify-center overflow-x-auto';
            if (bindFunctions) {
              bindFunctions(targetElement);
            }
          }
        } catch (err: any) {
          console.warn('Mermaid rendering error:', err);
          const targetElement =
            (initialElement.isConnected && container.contains(initialElement) ? initialElement : null) ||
            (encoded
              ? container.querySelector<HTMLElement>(
                  `.mermaid-diagram-code[data-mermaid-code="${encoded}"]:not([data-processed="true"])`
                )
              : null);

          if (targetElement && !isDisposed) {
            targetElement.innerHTML = `<div class="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs rounded-xl font-mono text-center">Mermaid Syntax Error: ${err?.message || 'Invalid diagram format'}</div>`;
            targetElement.setAttribute('data-processed', 'true');
          }
        }
      }
    };

    // 1. Initial render pass
    renderDiagrams();

    // 2. MutationObserver: automatically detect and process newly injected diagram nodes from dangerouslySetInnerHTML
    const observer = new MutationObserver(() => {
      if (
        container.querySelector(
          '.mermaid-diagram-code:not([data-processed="true"]), .mermaid:not([data-processed="true"])'
        )
      ) {
        renderDiagrams();
      }
    });

    observer.observe(container, { childList: true, subtree: true });

    return () => {
      isDisposed = true;
      observer.disconnect();
    };
  }, [previewHtml, isVisible]);

  // Click delegation handler for code block copy buttons
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.code-copy-btn');
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      const encoded = btn.getAttribute('data-copy-raw');
      const codeToCopy = encoded ? decodeURIComponent(encoded) : '';
      if (!codeToCopy) return;

      navigator.clipboard.writeText(codeToCopy).then(() => {
        btn.classList.add('copied');
        const textSpan = btn.querySelector('.copy-text');
        const copiedLabel = t('copied') || 'Copied!';
        const defaultLabel = t('copy') || 'Copy';
        if (textSpan) textSpan.textContent = copiedLabel;

        setTimeout(() => {
          btn.classList.remove('copied');
          if (textSpan) textSpan.textContent = defaultLabel;
        }, 2000);
      }).catch((err) => {
        console.warn('Failed to copy code to clipboard:', err);
      });
    },
    [t]
  );

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
      onClick={handleContainerClick}
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

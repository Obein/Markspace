import { useState, useEffect } from 'react';
import mermaid from 'mermaid';
import { IPreviewService } from '../../../interfaces/IPreviewService';
import { normalizeMermaidCode } from '../../../services/MarkdownPreviewService';

// Initialize Mermaid once with dark theme and loose security
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
  suppressErrorRendering: true,
});

export function useMarkdownPreview(
  content: string,
  category: string,
  previewService: IPreviewService
) {
  const [previewHtml, setPreviewHtml] = useState<string>('');

  // 1. Generate preview HTML on content or category changes
  useEffect(() => {
    if (category !== 'markdown') {
      setPreviewHtml('');
      return;
    }
    const html = previewService.renderPreview(content);
    setPreviewHtml(html);
  }, [content, category, previewService]);

  // 2. Render Mermaid diagrams whenever preview DOM is committed
  useEffect(() => {
    if (category !== 'markdown') return;

    let isMounted = true;
    const timeoutId = setTimeout(() => {
      if (!isMounted) return;

      const mermaidNodes = document.querySelectorAll<HTMLElement>(
        '.markdown-preview .mermaid-diagram-code:not([data-processed="true"]), .markdown-preview .mermaid:not([data-processed="true"])'
      );

      if (mermaidNodes.length === 0) return;

      mermaidNodes.forEach((element, idx) => {
        const id = `mermaid_${idx}_${Date.now()}`;
        const encoded = element.getAttribute('data-mermaid-code');
        const rawCode = encoded ? decodeURIComponent(encoded) : (element.textContent || '');
        const cleanCode = normalizeMermaidCode(rawCode);

        mermaid
          .render(id, cleanCode)
          .then(({ svg, bindFunctions }) => {
            if (isMounted && element) {
              element.innerHTML = svg;
              element.setAttribute('data-processed', 'true');
              element.className = 'w-full flex justify-center overflow-x-auto';
              if (bindFunctions) {
                bindFunctions(element);
              }
            }
          })
          .catch((err) => {
            console.warn('Mermaid rendering error:', err);
            if (isMounted && element) {
              element.innerHTML = `<div class="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl font-mono text-center">Mermaid Syntax Error: ${err?.message || 'Invalid diagram format'}</div>`;
              element.setAttribute('data-processed', 'true');
            }
          });
      });
    }, 30);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [previewHtml, category]);

  return { previewHtml };
}

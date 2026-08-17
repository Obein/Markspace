import { useState, useEffect } from 'react';
import mermaid from 'mermaid';
import { IPreviewService } from '../../../interfaces/IPreviewService';
import { normalizeMermaidCode } from '../../../services/MarkdownPreviewService';

export function useMarkdownPreview(
  content: string,
  category: string,
  previewService: IPreviewService
) {
  const [previewHtml, setPreviewHtml] = useState<string>('');

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
                  '.markdown-preview .mermaid-diagram-code:not([data-processed="true"]), .markdown-preview .mermaid:not([data-processed="true"])'
                );
                mermaidNodes.forEach((element, idx) => {
                  const id = `mermaid-svg-${Date.now()}-${idx}`;
                  const encoded = element.getAttribute('data-mermaid-code');
                  const rawCode = encoded ? decodeURIComponent(encoded) : (element.textContent || '');
                  const cleanCode = normalizeMermaidCode(rawCode);

                  mermaid
                    .render(id, cleanCode)
                    .then(({ svg }) => {
                      if (isMounted) {
                        element.innerHTML = svg;
                        element.setAttribute('data-processed', 'true');
                        element.className = 'w-full flex justify-center';
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

  return { previewHtml };
}

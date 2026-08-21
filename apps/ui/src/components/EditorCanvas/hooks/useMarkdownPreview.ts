import { useMemo } from 'react';
import { IPreviewService } from '../../../interfaces/IPreviewService';

/**
 * Hook calculating the HTML string for Markdown preview synchronously.
 * (DOM-level diagram rendering is cleanly encapsulated in MarkdownPreviewPane)
 */
export function useMarkdownPreview(
  content: string,
  category: string,
  previewService: IPreviewService
) {
  const previewHtml = useMemo(() => {
    if (category !== 'markdown') {
      return '';
    }
    return previewService.renderPreview(content);
  }, [content, category, previewService]);

  return { previewHtml };
}

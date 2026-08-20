import { useState, useEffect } from 'react';
import { IPreviewService } from '../../../interfaces/IPreviewService';

/**
 * Hook calculating the HTML string for Markdown preview.
 * (DOM-level diagram rendering is cleanly encapsulated in MarkdownPreviewPane)
 */
export function useMarkdownPreview(
  content: string,
  category: string,
  previewService: IPreviewService
) {
  const [previewHtml, setPreviewHtml] = useState<string>('');

  useEffect(() => {
    if (category !== 'markdown') {
      setPreviewHtml('');
      return;
    }
    const html = previewService.renderPreview(content);
    setPreviewHtml(html);
  }, [content, category, previewService]);

  return { previewHtml };
}

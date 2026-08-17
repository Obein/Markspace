import { useRef, useCallback } from 'react';

export function useSyncScroll() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScrollRef = useRef<'editor' | 'preview' | null>(null);

  const handleEditorScroll = useCallback(() => {
    if (isSyncingScrollRef.current === 'preview') return;
    if (!scrollContainerRef.current || !previewScrollRef.current) return;

    isSyncingScrollRef.current = 'editor';
    const editor = scrollContainerRef.current;
    const preview = previewScrollRef.current;

    const editorScrollRatio = editor.scrollTop / (editor.scrollHeight - editor.clientHeight || 1);
    preview.scrollTop = editorScrollRatio * (preview.scrollHeight - preview.clientHeight);

    setTimeout(() => {
      if (isSyncingScrollRef.current === 'editor') {
        isSyncingScrollRef.current = null;
      }
    }, 50);
  }, []);

  const handlePreviewScroll = useCallback(() => {
    if (isSyncingScrollRef.current === 'editor') return;
    if (!scrollContainerRef.current || !previewScrollRef.current) return;

    isSyncingScrollRef.current = 'preview';
    const editor = scrollContainerRef.current;
    const preview = previewScrollRef.current;

    const previewScrollRatio = preview.scrollTop / (preview.scrollHeight - preview.clientHeight || 1);
    editor.scrollTop = previewScrollRatio * (editor.scrollHeight - editor.clientHeight);

    setTimeout(() => {
      if (isSyncingScrollRef.current === 'preview') {
        isSyncingScrollRef.current = null;
      }
    }, 50);
  }, []);

  return {
    scrollContainerRef,
    previewScrollRef,
    handleEditorScroll,
    handlePreviewScroll,
  };
}

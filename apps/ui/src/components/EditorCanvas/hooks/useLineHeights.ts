import { useEffect, useRef, useState } from 'react';

export function useLineHeights(
  lines: string[],
  content: string,
  isSplitView: boolean,
  isPreview: boolean = false,
  isFullWidth: boolean = false
) {
  const [lineHeights, setLineHeights] = useState<number[]>([]);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isPreview && !isSplitView) {
      // In full preview mode, textarea is unmounted
      return;
    }

    let animationFrameId: number;

    const measure = () => {
      if (!mirrorRef.current || !textareaRef.current) return;
      const textarea = textareaRef.current;
      const mirror = mirrorRef.current;

      const clientWidth = textarea.clientWidth;
      // If textarea clientWidth is not yet calculated (e.g. initial mount/transition), retry on next frame
      if (clientWidth <= 0) {
        animationFrameId = requestAnimationFrame(measure);
        return;
      }

      const computed = window.getComputedStyle(textarea);
      // The mirror must match the textarea's *text column* width exactly.
      // Using clientWidth (which includes padding) makes the mirror wider than
      // the actual wrapping region, causing the line-height measurements to be
      // too low and the gutter numbers to drift out of sync when lines wrap.
      const paddingLeft = parseFloat(computed.paddingLeft) || 0;
      const paddingRight = parseFloat(computed.paddingRight) || 0;
      const textWidth = clientWidth - paddingLeft - paddingRight;

      mirror.style.width = `${textWidth}px`;
      mirror.style.font = computed.font;
      mirror.style.lineHeight = computed.lineHeight || '24px';
      // Do NOT copy padding onto the mirror — child div widths already
      // represent the pure text column, so padding would shrink them further.
      mirror.style.padding = '0';
      mirror.style.border = 'none';
      mirror.style.boxSizing = 'border-box';
      mirror.style.wordBreak = 'break-word';
      mirror.style.whiteSpace = 'pre-wrap';

      const childDivs = mirror.children;
      const heights: number[] = [];
      for (let i = 0; i < childDivs.length; i++) {
        const h = (childDivs[i] as HTMLElement).offsetHeight;
        heights.push(Math.max(h, 24));
      }
      setLineHeights(heights);
    };

    // Run measure after DOM has painted the textarea
    animationFrameId = requestAnimationFrame(measure);

    let resizeObserver: ResizeObserver | null = null;
    if (textareaRef.current) {
      resizeObserver = new ResizeObserver(() => {
        measure();
      });
      resizeObserver.observe(textareaRef.current);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [content, lines.length, isSplitView, isPreview, isFullWidth]);

  return { lineHeights, mirrorRef, textareaRef };
}

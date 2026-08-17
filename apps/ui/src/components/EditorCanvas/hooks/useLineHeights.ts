import { useEffect, useRef, useState } from 'react';

export function useLineHeights(lines: string[], content: string, isSplitView: boolean) {
  const [lineHeights, setLineHeights] = useState<number[]>([]);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!mirrorRef.current || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;

    const measure = () => {
      const computed = window.getComputedStyle(textarea);
      mirror.style.width = `${textarea.clientWidth}px`;
      mirror.style.font = computed.font;
      mirror.style.lineHeight = computed.lineHeight;
      mirror.style.padding = computed.padding;
      mirror.style.border = computed.border;
      mirror.style.boxSizing = computed.boxSizing;
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

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(textarea);

    return () => {
      resizeObserver.disconnect();
    };
  }, [content, lines.length, isSplitView]);

  return { lineHeights, mirrorRef, textareaRef };
}

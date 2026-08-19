import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { EditorHeightMap, LineCoordinate } from '../types/HeightMap.types';

const DEFAULT_LINE_HEIGHT = 24;

/**
 * Creates an empty/fallback Height Map for initial render or empty state.
 */
function createFallbackHeightMap(linesCount: number): EditorHeightMap {
  const coordinates: LineCoordinate[] = [];
  const lineHeights: number[] = [];
  let currentTop = 0;

  for (let i = 0; i < linesCount; i++) {
    lineHeights.push(DEFAULT_LINE_HEIGHT);
    coordinates.push({
      lineIndex: i,
      lineNumber: i + 1,
      height: DEFAULT_LINE_HEIGHT,
      top: currentTop,
      bottom: currentTop + DEFAULT_LINE_HEIGHT,
      visualRowCount: 1,
    });
    currentTop += DEFAULT_LINE_HEIGHT;
  }

  return {
    coordinates,
    totalHeight: Math.max(currentTop, DEFAULT_LINE_HEIGHT),
    lineHeights,
    getCoordinate: (idx: number) => coordinates[idx],
    getLineIndexAtY: (y: number) => {
      if (y <= 0) return 0;
      const idx = Math.floor(y / DEFAULT_LINE_HEIGHT);
      return Math.min(Math.max(0, idx), linesCount - 1);
    },
  };
}

/**
 * Hook: useHeightMap
 *
 * Implements the "Independent Layer & Coordinate Mapping" mechanism:
 * 1. Maintains an offscreen, identically-styled measurement mirror DOM tree.
 * 2. Continuously measures the exact wrapped height of each logical line against the active text column width.
 * 3. Builds an in-memory geometric index tree (EditorHeightMap) containing exact Y-axis pixel coordinates (top/bottom) for every line.
 * 4. Enables absolute positioning (top: Y px) in the line gutter and editor layers to prevent cumulative drift during multi-line soft wrapping or viewport resize.
 */
export function useHeightMap(
  lines: string[],
  content: string,
  isSplitView: boolean,
  isPreview: boolean = false,
  isFullWidth: boolean = false
) {
  const [heightMap, setHeightMap] = useState<EditorHeightMap>(() =>
    createFallbackHeightMap(lines.length || 1)
  );

  const mirrorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const measure = useCallback(() => {
    if (!mirrorRef.current || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;

    const clientWidth = textarea.clientWidth;
    // If textarea clientWidth is not yet painted, retry on next frame
    if (clientWidth <= 0) return;

    const computed = window.getComputedStyle(textarea);

    // Compute the exact inner text column width available for text wrapping
    const paddingLeft = parseFloat(computed.paddingLeft) || 0;
    const paddingRight = parseFloat(computed.paddingRight) || 0;
    const textWidth = Math.max(clientWidth - paddingLeft - paddingRight, 50);

    // Explicitly copy individual typography and wrapping properties.
    // Note: Never use computed.font directly as Chromium returns "" when properties are set separately.
    mirror.style.width = `${textWidth}px`;
    mirror.style.fontSize = computed.fontSize || '15px';
    mirror.style.fontFamily = computed.fontFamily || 'monospace';
    mirror.style.fontWeight = computed.fontWeight || '400';
    mirror.style.lineHeight = computed.lineHeight || `${DEFAULT_LINE_HEIGHT}px`;
    mirror.style.letterSpacing = computed.letterSpacing || 'normal';
    mirror.style.wordSpacing = computed.wordSpacing || 'normal';
    mirror.style.tabSize = computed.tabSize || '4';
    mirror.style.wordBreak = 'break-word';
    mirror.style.overflowWrap = 'break-word';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.boxSizing = 'border-box';
    mirror.style.padding = '0';
    mirror.style.border = 'none';
    mirror.style.margin = '0';

    const baseLineHeight = parseFloat(computed.lineHeight) || DEFAULT_LINE_HEIGHT;
    const childDivs = mirror.children;
    const count = lines.length;

    let currentTop = 0;
    const coordinates: LineCoordinate[] = [];
    const lineHeights: number[] = [];

    for (let i = 0; i < count; i++) {
      const child = childDivs[i] as HTMLElement | undefined;
      const measuredH = child ? child.getBoundingClientRect().height : baseLineHeight;
      // Guarantee minimum line height and round to clean pixels
      const height = Math.max(Math.round(measuredH), baseLineHeight);
      const visualRowCount = Math.max(1, Math.round(height / baseLineHeight));

      lineHeights.push(height);
      coordinates.push({
        lineIndex: i,
        lineNumber: i + 1,
        height,
        top: currentTop,
        bottom: currentTop + height,
        visualRowCount,
      });

      currentTop += height;
    }

    const totalHeight = Math.max(currentTop, baseLineHeight);

    // Fast binary search to find line index from any vertical Y coordinate
    const getLineIndexAtY = (y: number): number => {
      if (coordinates.length === 0) return 0;
      if (y <= 0) return 0;
      let low = 0;
      let high = coordinates.length - 1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const coord = coordinates[mid];
        if (y >= coord.top && y < coord.bottom) {
          return coord.lineIndex;
        } else if (y < coord.top) {
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }

      return Math.min(coordinates.length - 1, Math.max(0, low));
    };

    setHeightMap({
      coordinates,
      totalHeight,
      lineHeights,
      getCoordinate: (idx: number) => coordinates[idx],
      getLineIndexAtY,
    });
  }, [lines.length]);

  useEffect(() => {
    if (isPreview && !isSplitView) {
      // In full preview mode, textarea is not actively measuring
      return;
    }

    let animationFrameId: number;

    const scheduleMeasure = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        measure();
      });
    };

    scheduleMeasure();

    let resizeObserver: ResizeObserver | null = null;
    if (textareaRef.current) {
      resizeObserver = new ResizeObserver(() => {
        scheduleMeasure();
      });
      resizeObserver.observe(textareaRef.current);
    }

    window.addEventListener('resize', scheduleMeasure);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', scheduleMeasure);
    };
  }, [content, lines.length, isSplitView, isPreview, isFullWidth, measure]);

  // Expose lineHeights array as a convenience compatibility alias
  const lineHeights = useMemo(() => heightMap.lineHeights, [heightMap]);

  return {
    heightMap,
    lineHeights,
    mirrorRef,
    textareaRef,
    measure,
  };
}

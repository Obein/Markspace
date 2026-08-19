import { useHeightMap } from './useHeightMap';

/**
 * @deprecated Use `useHeightMap` instead for the full EditorHeightMap and coordinate mapping.
 */
export function useLineHeights(
  lines: string[],
  content: string,
  isSplitView: boolean,
  isPreview: boolean = false,
  isFullWidth: boolean = false
) {
  const { heightMap, lineHeights, mirrorRef, textareaRef } = useHeightMap(
    lines,
    content,
    isSplitView,
    isPreview,
    isFullWidth
  );

  return { heightMap, lineHeights, mirrorRef, textareaRef };
}

/**
 * Geometric coordinate mapping for a single logical line in the editor.
 */
export interface LineCoordinate {
  /** 0-indexed logical line index */
  lineIndex: number;
  /** 1-indexed human-readable line number (lineIndex + 1) */
  lineNumber: number;
  /** Exact measured pixel height of this line (including all soft wraps, min 24px) */
  height: number;
  /** Cumulative absolute Y pixel offset from the top of the editor content area */
  top: number;
  /** Cumulative bottom coordinate (top + height) */
  bottom: number;
  /** Number of visual wrapped rows this logical line spans */
  visualRowCount: number;
}

/**
 * Editor Height Map — in-memory geometric index tree of the document.
 * Provides coordinate mapping between logical line indices and visual Y-axis pixel coordinates.
 */
export interface EditorHeightMap {
  /** Coordinate mappings for all logical lines */
  coordinates: LineCoordinate[];
  /** Total document height in pixels (sum of all line heights) */
  totalHeight: number;
  /** Array of line heights for direct indexed access */
  lineHeights: number[];
  /** Get coordinate for a specific 0-indexed logical line */
  getCoordinate: (lineIndex: number) => LineCoordinate | undefined;
  /** Get the logical line index at a specific vertical Y pixel offset via binary search */
  getLineIndexAtY: (y: number) => number;
}

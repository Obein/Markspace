/**
 * CoordinateResolver
 * 
 * Handles spreadsheet coordinate conversion (e.g. A1 ↔ [row, col]),
 * rectangular cell range expansion (e.g. A1:B3), and data cell value sanitization.
 */
export class CoordinateResolver {
  /**
   * Converts spreadsheet column letters (e.g., "A", "Z", "AA", "BC") to a 0-indexed column index.
   * 
   * @param colStr Column letters string
   * @returns 0-indexed column index
   */
  public static colLetterToIndex(colStr: string): number {
    let index = 0;
    const upper = colStr.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
      index = index * 26 + (upper.charCodeAt(i) - 64);
    }
    return index - 1;
  }

  /**
   * Converts a 0-indexed column number back to spreadsheet column letters (e.g., 0 -> "A", 26 -> "AA").
   * 
   * @param index 0-indexed column index
   * @returns Column letters string
   */
  public static indexToColLetter(index: number): string {
    let col = '';
    let temp = index + 1;
    while (temp > 0) {
      const rem = (temp - 1) % 26;
      col = String.fromCharCode(65 + rem) + col;
      temp = Math.floor((temp - 1) / 26);
    }
    return col;
  }

  /**
   * Extracts and parses a single numeric value from a table grid cell using reference string (e.g. "A1", "C4").
   * Automatically strips currency symbols and thousands separators.
   * 
   * @param cellRef Cell reference string (e.g. "A1")
   * @param grid 2D array of table row strings (where row 0 is header, row 1 is separator, row 2+ is data)
   * @returns Numeric cell value, or 0 if unparseable/empty
   */
  public static getSingleCellValue(cellRef: string, grid: string[][]): number {
    const match = cellRef.match(/^([A-Z]+)([0-9]+)$/i);
    if (!match) return 0;

    const colIndex = this.colLetterToIndex(match[1]);
    const rowIndex = parseInt(match[2], 10) + 1; // 1-indexed data row mapped to grid index (offset by header & separator)

    if (rowIndex >= 2 && rowIndex < grid.length && colIndex >= 0 && colIndex < grid[rowIndex].length) {
      const raw = grid[rowIndex][colIndex];
      // If cell still contains an unevaluated formula, don't parse as number to avoid cycles
      if (raw.startsWith('=')) {
        return 0;
      }
      const sanitized = raw.replace(/[\$,¥,€,£]/g, '').replace(/,/g, '').trim();
      const val = parseFloat(sanitized);
      return isNaN(val) ? 0 : val;
    }
    return 0;
  }

  /**
   * Expands a spreadsheet range string (e.g., "A1:B3") into an array of numeric values.
   * 
   * @param rangeStr Range string format (e.g. "A1:B3")
   * @param grid 2D array of table cells
   * @returns Flat array of numbers extracted from the specified range
   */
  public static getRangeValues(rangeStr: string, grid: string[][]): number[] {
    const parts = rangeStr.split(':');
    if (parts.length !== 2) return [];

    const startMatch = parts[0].match(/([A-Z]+)([0-9]+)/i);
    const endMatch = parts[1].match(/([A-Z]+)([0-9]+)/i);
    if (!startMatch || !endMatch) return [];

    const startCol = this.colLetterToIndex(startMatch[1]);
    const startRow = parseInt(startMatch[2], 10);
    const endCol = this.colLetterToIndex(endMatch[1]);
    const endRow = parseInt(endMatch[2], 10);

    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);

    const values: number[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const colChar = this.indexToColLetter(c);
        values.push(this.getSingleCellValue(`${colChar}${r}`, grid));
      }
    }
    return values;
  }
}

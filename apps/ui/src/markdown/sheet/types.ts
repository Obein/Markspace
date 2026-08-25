/**
 * Supported token types for spreadsheet formula lexical analysis.
 */
export type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'IDENT'
  | 'RANGE'
  | 'ADD_OP'
  | 'MUL_OP'
  | 'POW_OP'
  | 'COMP_OP'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'COLON'
  | 'UNKNOWN';

/**
 * Token representation produced by FormulaTokenizer.
 */
export interface Token {
  type: TokenType;
  value: string;
}

/**
 * Possible evaluated formula output types.
 */
export type FormulaPrimitive = string | number | boolean;

/**
 * Evaluated expression result value (can be primitive or an array of numbers from a range).
 */
export type ExpressionValue = FormulaPrimitive | number[] | null | undefined;

/**
 * Coordinate representing a 0-indexed column and row location in a table.
 */
export interface CellCoordinate {
  col: number;
  row: number;
}
